import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { ReconciliationEngine } from "@/lib/reconciliation/engine";
import { ProcurementIntegrityMonitor } from "@/lib/integrity/monitor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Load active organization records
    const [pos, invoices, grns, payments, creditNotes, suppliers, docs, ruleConfigs] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { organizationId: org.id },
        include: { lines: true, amendments: true, supplier: true },
      }),
      prisma.invoice.findMany({
        where: { organizationId: org.id },
        include: { lines: true, supplier: true },
      }),
      prisma.goodsReceipt.findMany({
        where: { organizationId: org.id },
        include: { lines: true, supplier: true },
      }),
      prisma.payment.findMany({
        where: { organizationId: org.id },
        include: { allocations: { include: { invoice: true } }, supplier: true },
      }),
      prisma.creditNote.findMany({
        where: { organizationId: org.id },
        include: { supplier: true },
      }),
      prisma.supplier.findMany({
        where: { organizationId: org.id },
        include: { bankAccounts: true },
      }),
      prisma.uploadedDocument.findMany({
        where: { organizationId: org.id },
      }),
      prisma.ruleConfiguration.findMany({
        where: { organizationId: org.id, isActive: true },
      }),
    ]);

    // Read tolerances from persisted RuleConfiguration
    const priceTolRule = ruleConfigs.find((r) => r.ruleKey === "PRICE_TOLERANCE_PCT");
    const qtyTolRule = ruleConfigs.find((r) => r.ruleKey === "QTY_TOLERANCE_PCT");
    const approvalRule = ruleConfigs.find((r) => r.ruleKey === "APPROVAL_LIMIT_INR");
    const dupeWindowRule = ruleConfigs.find((r) => r.ruleKey === "DUPLICATE_WINDOW_DAYS");

    const tolerances = {
      priceTolerancePct: priceTolRule?.valueFloat ?? 0.5,
      quantityTolerancePct: qtyTolRule?.valueFloat ?? 0.0,
      taxRoundingToleranceINR: 2.0,
      approvalLimitThresholdINR: approvalRule?.valueFloat ?? 50000.0,
      duplicateWindowDays: dupeWindowRule?.valueFloat ?? 60,
    };

    // Format into reconciliation dataset
    const dataset = {
      purchaseOrders: pos.map((p) => ({
        id: p.id,
        poNumber: p.poNumber,
        poDate: p.poDate.toISOString(),
        supplierId: p.supplierId,
        supplierName: p.supplier.legalName,
        vendorCode: p.supplier.vendorCode,
        status: p.status,
        currency: p.currency,
        subtotal: p.subtotal,
        taxAmount: p.taxAmount,
        totalAmount: p.totalAmount,
        lines: p.lines.map((l) => ({
          id: l.id,
          itemDescription: l.itemDescription,
          sku: l.sku || undefined,
          orderedQuantity: l.orderedQuantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          lineTotal: l.lineTotal,
        })),
        amendments: p.amendments.map((a) => ({
          amendmentNumber: a.amendmentNumber,
          amendmentDate: a.amendmentDate.toISOString(),
          reason: a.reason,
          previousAmount: a.previousAmount,
          newAmount: a.newAmount,
          approvedBy: a.approvedBy || undefined,
        })),
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate.toISOString(),
        poNumber: pos.find((p) => p.id === i.purchaseOrderId)?.poNumber,
        supplierId: i.supplierId,
        supplierName: i.supplier.legalName,
        vendorCode: i.supplier.vendorCode,
        status: i.status,
        subtotal: i.subtotal,
        cgstAmount: i.cgstAmount,
        sgstAmount: i.sgstAmount,
        igstAmount: i.igstAmount,
        totalTaxAmount: i.totalTaxAmount,
        totalAmount: i.totalAmount,
        paidAmount: i.paidAmount,
        ocrConfidence: i.ocrConfidence || 1.0,
        lines: i.lines.map((l) => ({
          id: l.id,
          itemDescription: l.itemDescription,
          billedQuantity: l.billedQuantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          lineTotal: l.lineTotal,
        })),
      })),
      goodsReceipts: grns.map((g) => ({
        id: g.id,
        grnNumber: g.grnNumber,
        grnDate: g.grnDate.toISOString(),
        poNumber: pos.find((p) => p.id === g.purchaseOrderId)?.poNumber,
        supplierId: g.supplierId,
        supplierName: g.supplier.legalName,
        receivedBy: g.receivedBy || undefined,
        lines: g.lines.map((l) => ({
          id: l.id,
          itemDescription: l.itemDescription,
          receivedQuantity: l.receivedQuantity,
          acceptedQuantity: l.acceptedQuantity,
          rejectedQuantity: l.rejectedQuantity,
        })),
      })),
      payments: payments.map((pm) => ({
        id: pm.id,
        paymentReference: pm.paymentReference,
        paymentDate: pm.paymentDate.toISOString(),
        amount: pm.amount,
        supplierId: pm.supplierId,
        supplierName: pm.supplier.legalName,
        allocatedInvoiceNumbers: pm.allocations.map((a) => a.invoice.invoiceNumber),
      })),
      creditNotes: creditNotes.map((c) => ({
        id: c.id,
        creditNoteNumber: c.creditNoteNumber,
        creditDate: c.creditDate.toISOString(),
        supplierId: c.supplierId,
        supplierName: c.supplier.legalName,
        amount: c.amount,
        reason: c.reason || undefined,
        isApplied: c.isApplied,
      })),
    };

    const reconEngine = new ReconciliationEngine(tolerances);
    const reconResult = reconEngine.reconcile(dataset);

    const monitor = new ProcurementIntegrityMonitor(tolerances);
    const integrityFindings = monitor.analyze({
      invoices: dataset.invoices,
      payments: dataset.payments,
      purchaseOrders: dataset.purchaseOrders,
      suppliers: suppliers.map((s) => ({
        id: s.id,
        vendorCode: s.vendorCode,
        name: s.legalName,
        bankAccountNumber: s.bankAccounts[0]?.accountNumber,
        ifscCode: s.bankAccounts[0]?.ifscCode,
        contactEmail: s.email || undefined,
      })),
      uploadedDocuments: docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        fileHashSha256: d.fileHashSha256,
        uploadedAt: d.createdAt.toISOString(),
      })),
      approvalLimitThresholdINR: tolerances.approvalLimitThresholdINR,
    });

    const allFindings = [...reconResult.findings, ...integrityFindings];

    // Transactionally update findings and reconciliation run
    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.reconciliationRun.create({
        data: {
          organizationId: org.id,
          runType: "ON_DEMAND_BATCH",
          status: "COMPLETED",
          documentsCount: reconResult.totalDocumentsProcessed,
          findingsCount: allFindings.length,
          totalExposure: reconResult.netUniqueExposureINR,
        },
      });

      // Upsert findings so re-running does not duplicate unresolved findings
      for (const f of allFindings) {
        const existingFinding = await tx.discrepancyFinding.findUnique({
          where: {
            organizationId_findingCode: {
              organizationId: org.id,
              findingCode: f.findingCode,
            },
          },
        });

        if (!existingFinding) {
          await tx.discrepancyFinding.create({
            data: {
              organizationId: org.id,
              reconciliationRunId: createdRun.id,
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
              assignedAuditorName: session.name,
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          organizationId: org.id,
          userId: session.userId,
          userName: session.name,
          action: "RECONCILIATION_RUN_COMPLETED",
          resourceType: "RECONCILIATION_RUN",
          resourceId: createdRun.id,
          detailsJson: JSON.stringify({
            documentsProcessed: reconResult.totalDocumentsProcessed,
            findingsGenerated: allFindings.length,
            netExposureINR: reconResult.netUniqueExposureINR,
          }),
        },
      });

      return createdRun;
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      documentsProcessed: reconResult.totalDocumentsProcessed,
      findingsGenerated: allFindings.length,
      netUniqueExposureINR: reconResult.netUniqueExposureINR,
      findings: allFindings,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
