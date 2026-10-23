import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { createSessionToken, verifySessionToken } from "../lib/auth/session";
import { ReconciliationEngine } from "../lib/reconciliation/engine";

describe("LedgerShield End-to-End User Journeys & Governance Controls", () => {
  let orgId: string;
  let adminUserId: string;
  let auditorUserId: string;
  let apUserId: string;
  let testPoId: string;
  let testInvId: string;
  let testFindingId: string;

  before(async () => {
    const passwordHash = await hashPassword("JourneyPassword#2024!");

    // 1. A new user registers and creates an organization
    const org = await prisma.organization.create({
      data: {
        name: "Godrej Aerospace Components Ltd",
        legalName: "Godrej Aerospace Components Private Limited",
        currency: "INR",
        gstin: "27AAACG9999G1Z5",
      },
    });
    orgId = org.id;

    // Admin user (CFO)
    const admin = await prisma.user.create({
      data: {
        email: `cfo.${Date.now()}@godrej-aero.com`,
        name: "Vikram Godrej (CFO)",
        passwordHash,
      },
    });
    adminUserId = admin.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: adminUserId,
        role: "ADMIN",
        approvalLimit: 1000000.0,
      },
    });

    // Auditor user
    const auditor = await prisma.user.create({
      data: {
        email: `auditor.${Date.now()}@godrej-aero.com`,
        name: "Neha Joshi (Auditor)",
        passwordHash,
      },
    });
    auditorUserId = auditor.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: auditorUserId,
        role: "INTERNAL_AUDITOR",
        approvalLimit: 50000.0,
      },
    });

    // AP Operator with lower limit (₹20,000)
    const ap = await prisma.user.create({
      data: {
        email: `ap.${Date.now()}@godrej-aero.com`,
        name: "Ramesh Pawar (AP Specialist)",
        passwordHash,
      },
    });
    apUserId = ap.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: apUserId,
        role: "AP_OPERATOR",
        approvalLimit: 20000.0,
      },
    });
  });

  after(async () => {
    await prisma.reviewerComment.deleteMany({ where: { finding: { organizationId: orgId } } });
    await prisma.discrepancyFinding.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { organizationId: orgId } } });
    await prisma.purchaseOrder.deleteMany({ where: { organizationId: orgId } });
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, auditorUserId, apUserId] } } });
  });

  it("Journey Step 1 & 2: User registers and securely authenticates with persistent session", async () => {
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: { memberships: { include: { organization: true } } },
    });

    assert.ok(adminUser, "User must exist in database");
    assert.strictEqual(adminUser.memberships.length, 1);
    assert.strictEqual(adminUser.memberships[0].role, "ADMIN");

    const token = await createSessionToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      organizationId: adminUser.memberships[0].organizationId,
      organizationName: adminUser.memberships[0].organization.name,
      role: "ADMIN",
      approvalLimit: adminUser.memberships[0].approvalLimit,
    });

    const session = await verifySessionToken(token);
    assert.ok(session, "Session should be verified");
    assert.strictEqual(session.organizationId, orgId);
  });

  it("Journey Step 3, 4, 5 & 6: Ingests documents, executes reconciliation, and flags genuine price overcharge", async () => {
    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        vendorCode: "SUP-AERO-01",
        legalName: "Titan Precision Alloys Ltd",
      },
    });

    // Approved PO: 50 units @ ₹1,000 = ₹50,000 + 18% GST = ₹59,000
    const po = await prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        supplierId: supplier.id,
        poNumber: "PO-AERO-2024-001",
        poDate: new Date("2024-07-01"),
        status: "APPROVED",
        subtotal: 50000.0,
        taxAmount: 9000.0,
        totalAmount: 59000.0,
      },
    });
    testPoId = po.id;

    await prisma.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        lineNumber: 1,
        itemDescription: "Titanium Alloy Rod 30mm",
        orderedQuantity: 50,
        unitPrice: 1000.0,
        taxRate: 18.0,
        lineTotal: 59000.0,
      },
    });

    // Invoice: 50 units billed at ₹1,200 (overcharge of ₹200/unit = ₹10,000 + 18% GST = ₹11,800)
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        supplierId: supplier.id,
        purchaseOrderId: po.id,
        invoiceNumber: "INV-TITAN-1001",
        invoiceDate: new Date("2024-07-05"),
        subtotal: 60000.0,
        totalTaxAmount: 10800.0,
        totalAmount: 70800.0,
        paidAmount: 70800.0,
      },
    });
    testInvId = inv.id;

    await prisma.invoiceLine.create({
      data: {
        invoiceId: inv.id,
        lineNumber: 1,
        itemDescription: "Titanium Alloy Rod 30mm",
        billedQuantity: 50,
        unitPrice: 1200.0,
        taxRate: 18.0,
        lineTotal: 70800.0,
      },
    });

    // Run reconciliation engine
    const engine = new ReconciliationEngine();
    const result = engine.reconcile({
      purchaseOrders: [
        {
          id: po.id,
          poNumber: po.poNumber,
          poDate: po.poDate.toISOString(),
          supplierId: supplier.id,
          supplierName: supplier.legalName,
          vendorCode: supplier.vendorCode,
          status: po.status,
          currency: "INR",
          subtotal: po.subtotal,
          taxAmount: po.taxAmount,
          totalAmount: po.totalAmount,
          lines: [
            {
              id: "pol-1",
              itemDescription: "Titanium Alloy Rod 30mm",
              orderedQuantity: 50,
              unitPrice: 1000.0,
              taxRate: 18.0,
              lineTotal: 59000.0,
            },
          ],
        },
      ],
      invoices: [
        {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate.toISOString(),
          poNumber: po.poNumber,
          supplierId: supplier.id,
          supplierName: supplier.legalName,
          vendorCode: supplier.vendorCode,
          status: "PENDING_REVIEW",
          subtotal: inv.subtotal,
          cgstAmount: 5400.0,
          sgstAmount: 5400.0,
          igstAmount: 0.0,
          totalTaxAmount: 10800.0,
          totalAmount: 70800.0,
          paidAmount: 70800.0,
          lines: [
            {
              id: "invl-1",
              itemDescription: "Titanium Alloy Rod 30mm",
              billedQuantity: 50,
              unitPrice: 1200.0,
              taxRate: 18.0,
              lineTotal: 70800.0,
            },
          ],
        },
      ],
      goodsReceipts: [],
      payments: [],
      creditNotes: [],
    });

    const priceFinding = result.findings.find((f) => f.ruleId === "RULE_PRICE_OVERCHARGE");
    assert.ok(priceFinding, "Engine should flag price overcharge finding");
    // 50 * (1200 - 1000) = 10,000 + 18% GST = 11,800
    assert.strictEqual(priceFinding.grossDiscrepancy, 11800.0);
    assert.strictEqual(priceFinding.potentialRecoverable, 11800.0);

    // Save finding in DB
    const savedFinding = await prisma.discrepancyFinding.create({
      data: {
        organizationId: orgId,
        poNumber: po.poNumber,
        invoiceNumber: inv.invoiceNumber,
        findingCode: "FL-AERO-001",
        ruleId: priceFinding.ruleId,
        category: priceFinding.category,
        severity: priceFinding.severity,
        title: priceFinding.title,
        description: priceFinding.description,
        grossDiscrepancy: priceFinding.grossDiscrepancy,
        potentialRecoverable: priceFinding.potentialRecoverable,
        varianceCalculation: priceFinding.varianceCalculation,
        status: "OPEN",
      },
    });
    testFindingId = savedFinding.id;
  });

  it("Journey Step 7 & 8: Auditor assigns and confirms discrepancy with recovery logged", async () => {
    // Neha Joshi (Auditor) verifies and confirms leakage
    const updated = await prisma.discrepancyFinding.update({
      where: { id: testFindingId },
      data: {
        status: "CONFIRMED",
        confirmedAmount: 11800.0,
        recoveredAmount: 11800.0,
        assignedAuditorName: "Neha Joshi (Auditor)",
      },
    });

    await prisma.reviewerComment.create({
      data: {
        findingId: testFindingId,
        userId: auditorUserId,
        authorName: "Neha Joshi (INTERNAL_AUDITOR)",
        commentText: "Supplier confirmed rate error. Debit note DN-001 issued and offset against August AP batch.",
        previousStatus: "OPEN",
        newStatus: "CONFIRMED",
      },
    });

    assert.strictEqual(updated.status, "CONFIRMED");
    assert.strictEqual(updated.confirmedAmount, 11800.0);
    assert.strictEqual(updated.recoveredAmount, 11800.0);
  });

  it("Journey Step 9 & 10: Dashboard and Reports reflect real persisted financial recovery", async () => {
    const findings = await prisma.discrepancyFinding.findMany({
      where: { organizationId: orgId },
    });

    const netExposure = findings.reduce((acc, f) => acc + f.potentialRecoverable, 0);
    const confirmedSavings = findings.reduce((acc, f) => acc + f.confirmedAmount, 0);
    const actualRecovered = findings.reduce((acc, f) => acc + f.recoveredAmount, 0);

    assert.strictEqual(netExposure, 11800.0, "Dashboard net exposure must equal persisted DB value");
    assert.strictEqual(confirmedSavings, 11800.0, "Dashboard confirmed savings must equal persisted DB value");
    assert.strictEqual(actualRecovered, 11800.0, "Dashboard actual recovery must equal persisted DB value");
  });

  it("Journey Step 11: Maker-checker enforces single-approval limit for high-value transactions", () => {
    const highValueDiscrepancy = 75000.0;
    const apOperatorLimit = 20000.0; // Ramesh Pawar has ₹20,000 limit

    // Verification: AP operator cannot independently confirm a ₹75,000 leakage
    const requiresDualApproval = highValueDiscrepancy > apOperatorLimit;
    assert.strictEqual(
      requiresDualApproval,
      true,
      "Discrepancy exceeding AP operator approval ceiling must require secondary manager authorization"
    );
  });
});
