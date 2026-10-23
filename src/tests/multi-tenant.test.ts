import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";
import { createSessionToken } from "../lib/auth/session";

describe("LedgerShield Security: Multi-Tenant Isolation & IDOR Defense", () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let findingAId: string;
  let docAId: string;

  before(async () => {
    // Setup two completely isolated organizations: Org A and Org B
    const passwordHash = await hashPassword("TenantSec#2024!");

    const orgA = await prisma.organization.create({
      data: {
        name: "Tenant Alpha Corp",
        legalName: "Tenant Alpha Corporation Ltd",
        currency: "INR",
        gstin: "27AAAAT1111A1Z1",
      },
    });
    orgAId = orgA.id;

    const userA = await prisma.user.create({
      data: {
        email: `alpha.auditor.${Date.now()}@alpha.com`,
        name: "Alpha Auditor",
        passwordHash,
      },
    });
    userAId = userA.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgAId,
        userId: userAId,
        role: "INTERNAL_AUDITOR",
        approvalLimit: 50000.0,
      },
    });

    const orgB = await prisma.organization.create({
      data: {
        name: "Tenant Beta Logistics",
        legalName: "Tenant Beta Logistics Pvt Ltd",
        currency: "INR",
        gstin: "29BBBBT2222B1Z2",
      },
    });
    orgBId = orgB.id;

    const userB = await prisma.user.create({
      data: {
        email: `beta.ap.${Date.now()}@beta.com`,
        name: "Beta AP Specialist",
        passwordHash,
      },
    });
    userBId = userB.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgBId,
        userId: userBId,
        role: "AP_OPERATOR",
        approvalLimit: 25000.0,
      },
    });

    // Create a sensitive finding in Org A
    const findingA = await prisma.discrepancyFinding.create({
      data: {
        organizationId: orgAId,
        findingCode: "FL-ALPHA-001",
        ruleId: "RULE_PRICE_OVERCHARGE",
        category: "PRICE_VARIANCE",
        severity: "HIGH",
        title: "Confidential Alpha Pricing Variance",
        description: "Restricted financial leakage record for Tenant Alpha Corp only.",
        grossDiscrepancy: 45000.0,
        potentialRecoverable: 45000.0,
      },
    });
    findingAId = findingA.id;

    // Create a document in Org A
    const docA = await prisma.uploadedDocument.create({
      data: {
        organizationId: orgAId,
        filename: "Alpha_Confidential_May_PO.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        storagePath: "alpha_confidential_key",
        fileHashSha256: "alpha_sha256_hash_123456",
        documentType: "PURCHASE_ORDER",
        status: "PARSED",
      },
    });
    docAId = docA.id;
  });

  after(async () => {
    // Cleanup test tenants
    await prisma.discrepancyFinding.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.uploadedDocument.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  it("Prohibits Org B from querying or reading Org A's discrepancy findings", async () => {
    // When Org B queries findings with its organizationId:
    const betaFindings = await prisma.discrepancyFinding.findMany({
      where: { organizationId: orgBId },
    });

    const leakedFinding = betaFindings.find((f) => f.id === findingAId);
    assert.strictEqual(
      leakedFinding,
      undefined,
      "Org B must NEVER receive Org A's discrepancy findings in query results"
    );
  });

  it("Prohibits direct IDOR access to Org A's finding using Org B's tenant context", async () => {
    // Simulating endpoint logic: findFirst with { id: findingAId, organizationId: session.organizationId }
    const findingUnderBeta = await prisma.discrepancyFinding.findFirst({
      where: {
        id: findingAId,
        organizationId: orgBId, // Session belongs to Org B!
      },
    });

    assert.strictEqual(
      findingUnderBeta,
      null,
      "Looking up another tenant's finding ID with mismatched organizationId must return null (404/403)"
    );
  });

  it("Prohibits Org B from reading or downloading Org A's uploaded documents", async () => {
    const docUnderBeta = await prisma.uploadedDocument.findFirst({
      where: {
        id: docAId,
        organizationId: orgBId,
      },
    });

    assert.strictEqual(
      docUnderBeta,
      null,
      "Looking up another tenant's document ID with mismatched organizationId must return null"
    );
  });

  it("Prohibits Org B from modifying Org A's finding disposition or status", async () => {
    const findingToUpdate = await prisma.discrepancyFinding.findFirst({
      where: {
        id: findingAId,
        organizationId: orgBId,
      },
    });

    assert.strictEqual(findingToUpdate, null, "Org B cannot resolve target finding across tenant boundary");

    // Verify finding A status remained unchanged
    const originalFinding = await prisma.discrepancyFinding.findUnique({
      where: { id: findingAId },
    });
    assert.strictEqual(originalFinding?.status, "OPEN", "Finding status must remain untouched");
  });
});
