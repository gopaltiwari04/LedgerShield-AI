import { prisma } from "../prisma";
import { generateScenariosDataset } from "./scenarios";
import { ReconciliationEngine } from "../reconciliation/engine";
import { ProcurementIntegrityMonitor } from "../integrity/monitor";
import { hashPassword } from "../auth/password";

export async function seedDatabase() {
  console.log("Starting LedgerShield database seed...");

  // 1. Create Demo Organization
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-1" },
    update: {},
    create: {
      id: "demo-org-1",
      name: "Mahindra Precision Engineering Ltd",
      legalName: "Mahindra Precision Engineering Private Limited",
      gstin: "27AAACM1234F1Z5",
      pan: "AAACM1234F",
      state: "Maharashtra (27)",
      currency: "INR",
      address: "Plot 42, MIDC Industrial Area, Chakan, Pune, Maharashtra 410501",
    },
  });

  // 2. Create Users with Different RBAC Roles
  const users = [
    {
      id: "usr-admin",
      email: "rajesh.verma@mahindra-pe.com",
      name: "Rajesh Verma",
      department: "Executive Management",
      designation: "Chief Financial Officer",
      role: "ADMIN",
      approvalLimit: 1000000.0,
    },
    {
      id: "usr-auditor",
      email: "priya.nair@mahindra-pe.com",
      name: "Priya Nair",
      department: "Internal Audit",
      designation: "Lead Financial Auditor",
      role: "INTERNAL_AUDITOR",
      approvalLimit: 0.0,
    },
    {
      id: "usr-ap",
      email: "vikram.sharma@mahindra-pe.com",
      name: "Vikram Sharma",
      department: "Accounts Payable",
      designation: "AP Specialist",
      role: "AP_OPERATOR",
      approvalLimit: 50000.0,
    },
    {
      id: "usr-proc",
      email: "sanjay.deshmukh@mahindra-pe.com",
      name: "Sanjay Deshmukh",
      department: "Procurement",
      designation: "Senior Purchasing Manager",
      role: "PROCUREMENT_MANAGER",
      approvalLimit: 250000.0,
    },
  ];

  const defaultPasswordHash = await hashPassword("AuditLead#2024!");

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: defaultPasswordHash },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: defaultPasswordHash,
        department: u.department,
        designation: u.designation,
      },
    });

    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        userId: user.id,
        role: u.role,
        approvalLimit: u.approvalLimit,
      },
    });
  }

  // 3. Clear existing transaction data in demo org to ensure idempotent run
  await prisma.findingEvidence.deleteMany({});
  await prisma.riskSignal.deleteMany({});
  await prisma.reviewerComment.deleteMany({});
  await prisma.investigation.deleteMany({});
  await prisma.discrepancyFinding.deleteMany({});
  await prisma.reconciliationRun.deleteMany({});
  await prisma.goodsReceiptLine.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrderAmendment.deleteMany({});
  await prisma.purchaseOrderLine.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.supplierBankAccount.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.uploadedDocument.deleteMany({});

  const { dataset, suppliers, uploadedDocuments } = generateScenariosDataset();

  // 4. Insert Suppliers
  for (const s of suppliers) {
    const sup = await prisma.supplier.create({
      data: {
        id: s.id,
        organizationId: org.id,
        vendorCode: s.vendorCode,
        legalName: s.name,
        email: s.contactEmail,
      },
    });

    if (s.bankAccountNumber) {
      await prisma.supplierBankAccount.create({
        data: {
          supplierId: sup.id,
          bankName: s.bankAccountNumber.startsWith("HDFC") ? "HDFC Bank" : "State Bank of India",
          accountNumber: s.bankAccountNumber,
          ifscCode: s.ifscCode || "HDFC0000240",
          isVerified: true,
        },
      });
    }
  }

  // 5. Insert Purchase Orders
  for (const po of dataset.purchaseOrders) {
    const createdPo = await prisma.purchaseOrder.create({
      data: {
        id: po.id,
        organizationId: org.id,
        supplierId: po.supplierId,
        poNumber: po.poNumber,
        poDate: new Date(po.poDate),
        status: po.status,
        subtotal: po.subtotal,
        taxAmount: po.taxAmount,
        totalAmount: po.totalAmount,
        currency: po.currency,
      },
    });

    for (const line of po.lines) {
      await prisma.purchaseOrderLine.create({
        data: {
          id: line.id,
          purchaseOrderId: createdPo.id,
          lineNumber: 1,
          itemDescription: line.itemDescription,
          sku: line.sku,
          orderedQuantity: line.orderedQuantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          taxAmount: (line.unitPrice * line.orderedQuantity * line.taxRate) / 100,
          lineTotal: line.lineTotal,
        },
      });
    }

    if (po.amendments) {
      for (const a of po.amendments) {
        await prisma.purchaseOrderAmendment.create({
          data: {
            purchaseOrderId: createdPo.id,
            amendmentNumber: a.amendmentNumber,
            amendmentDate: new Date(a.amendmentDate),
            reason: a.reason,
            previousAmount: a.previousAmount,
            newAmount: a.newAmount,
            approvedBy: a.approvedBy,
          },
        });
      }
    }
  }

  // 6. Insert Invoices
  for (const inv of dataset.invoices) {
    const createdInv = await prisma.invoice.create({
      data: {
        id: inv.id,
        organizationId: org.id,
        supplierId: inv.supplierId,
        purchaseOrderId: inv.poNumber ? dataset.purchaseOrders.find((p) => p.poNumber === inv.poNumber)?.id : null,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: new Date(inv.invoiceDate),
        subtotal: inv.subtotal,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount,
        totalTaxAmount: inv.totalTaxAmount,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        ocrConfidence: inv.ocrConfidence || 1.0,
      },
    });

    for (let idx = 0; idx < inv.lines.length; idx++) {
      const line = inv.lines[idx];
      await prisma.invoiceLine.create({
        data: {
          id: line.id,
          invoiceId: createdInv.id,
          lineNumber: idx + 1,
          itemDescription: line.itemDescription,
          billedQuantity: line.billedQuantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          cgstAmount: line.cgstAmount || 0,
          sgstAmount: line.sgstAmount || 0,
          igstAmount: line.igstAmount || 0,
          lineTotal: line.lineTotal,
        },
      });
    }
  }

  // 7. Insert GRNs
  for (const grn of dataset.goodsReceipts) {
    const createdGrn = await prisma.goodsReceipt.create({
      data: {
        id: grn.id,
        organizationId: org.id,
        supplierId: grn.supplierId,
        purchaseOrderId: grn.poNumber ? dataset.purchaseOrders.find((p) => p.poNumber === grn.poNumber)?.id : null,
        grnNumber: grn.grnNumber,
        grnDate: new Date(grn.grnDate),
        receivedBy: grn.receivedBy,
      },
    });

    for (let idx = 0; idx < grn.lines.length; idx++) {
      const line = grn.lines[idx];
      await prisma.goodsReceiptLine.create({
        data: {
          id: line.id,
          goodsReceiptId: createdGrn.id,
          lineNumber: idx + 1,
          itemDescription: line.itemDescription,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          rejectedQuantity: line.rejectedQuantity,
        },
      });
    }
  }

  // 8. Insert Payments
  for (const pmt of dataset.payments) {
    const createdPmt = await prisma.payment.create({
      data: {
        id: pmt.id,
        organizationId: org.id,
        supplierId: pmt.supplierId,
        paymentReference: pmt.paymentReference,
        paymentDate: new Date(pmt.paymentDate),
        amount: pmt.amount,
      },
    });

    for (const invNum of pmt.allocatedInvoiceNumbers) {
      const inv = dataset.invoices.find((i) => i.invoiceNumber === invNum);
      if (inv) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: createdPmt.id,
            invoiceId: inv.id,
            allocatedAmount: pmt.amount,
          },
        });
      }
    }
  }

  // 9. Insert Credit Notes
  for (const cn of dataset.creditNotes) {
    await prisma.creditNote.create({
      data: {
        id: cn.id,
        organizationId: org.id,
        supplierId: cn.supplierId,
        creditNoteNumber: cn.creditNoteNumber,
        creditDate: new Date(cn.creditDate),
        amount: cn.amount,
        reason: cn.reason,
        isApplied: cn.isApplied,
      },
    });
  }

  // 10. Execute Reconciliation & Integrity Engines to populate findings
  const reconEngine = new ReconciliationEngine();
  const reconResult = reconEngine.reconcile(dataset);

  const monitor = new ProcurementIntegrityMonitor();
  const integrityFindings = monitor.analyze({
    invoices: dataset.invoices,
    payments: dataset.payments,
    purchaseOrders: dataset.purchaseOrders,
    suppliers,
    uploadedDocuments,
  });

  const allFindings = [...reconResult.findings, ...integrityFindings];

  const reconRun = await prisma.reconciliationRun.create({
    data: {
      organizationId: org.id,
      runType: "BENCHMARK_SCENARIOS_RUN",
      status: "COMPLETED",
      documentsCount: reconResult.totalDocumentsProcessed,
      findingsCount: allFindings.length,
      totalExposure: reconResult.netUniqueExposureINR,
    },
  });

  // 11. Save all findings to Database
  for (const f of allFindings) {
    const createdFinding = await prisma.discrepancyFinding.create({
      data: {
        organizationId: org.id,
        reconciliationRunId: reconRun.id,
        supplierId: f.supplierId,
        poNumber: f.poNumber,
        invoiceNumber: f.invoiceNumber,
        findingCode: f.findingCode,
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        status: f.status,
        title: f.title,
        description: f.description,
        grossDiscrepancy: f.grossDiscrepancy,
        amountPaid: f.amountPaid,
        unpaidDisputedAmount: f.unpaidDisputedAmount,
        potentialOverpayment: f.potentialOverpayment,
        potentialRecoverable: f.potentialRecoverable,
        confirmedAmount: f.confirmedAmount,
        recoveredAmount: f.recoveredAmount,
        exposureGroupId: f.exposureGroupId,
        financialImpactScore: f.financialImpactScore,
        anomalyConfidence: f.anomalyConfidence,
        fraudSuspicionScore: f.fraudSuspicionScore,
        compositeRiskScore: f.compositeRiskScore,
        expectedValue: f.expectedValue,
        observedValue: f.observedValue,
        varianceCalculation: f.varianceCalculation,
        recommendedAction: f.recommendedAction,
        assignedAuditorName: f.assignedAuditorName || "Priya Nair (Lead Auditor)",
      },
    });

    if (f.evidences) {
      for (const ev of f.evidences) {
        await prisma.findingEvidence.create({
          data: {
            findingId: createdFinding.id,
            documentType: ev.documentType,
            documentNumber: ev.documentNumber,
            documentDate: ev.documentDate ? new Date(ev.documentDate) : null,
            sourceField: ev.sourceField,
            sourceValue: ev.sourceValue,
          },
        });
      }
    }

    if (f.riskSignals) {
      for (const rs of f.riskSignals) {
        await prisma.riskSignal.create({
          data: {
            findingId: createdFinding.id,
            signalType: rs.signalType,
            description: rs.description,
            weight: rs.weight,
          },
        });
      }
    }
  }

  // Record Audit Event
  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      userName: "Priya Nair",
      action: "BENCHMARK_RECONCILIATION_RUN",
      resourceType: "RECONCILIATION_RUN",
      resourceId: reconRun.id,
      detailsJson: JSON.stringify({
        findingsCount: allFindings.length,
        netExposureINR: reconResult.netUniqueExposureINR,
      }),
    },
  });

  console.log(`Database seeded successfully! Generated ${allFindings.length} findings with net exposure of ₹${reconResult.netUniqueExposureINR}.`);
}

// Allow direct execution via tsx
if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
