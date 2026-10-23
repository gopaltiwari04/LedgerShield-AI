import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const statusFilter = searchParams.get("status");

    const findingWhere: any = { organizationId: org.id };
    if (supplierId && supplierId !== "ALL") findingWhere.supplierId = supplierId;
    if (statusFilter && statusFilter !== "ALL") findingWhere.status = statusFilter;

    const [
      findings,
      invoices,
      pos,
      grns,
      payments,
      creditNotes,
      suppliers,
    ] = await Promise.all([
      prisma.discrepancyFinding.findMany({
        where: findingWhere,
        include: { supplier: true, evidences: true, riskSignals: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({ where: { organizationId: org.id } }),
      prisma.purchaseOrder.findMany({ where: { organizationId: org.id } }),
      prisma.goodsReceipt.findMany({ where: { organizationId: org.id } }),
      prisma.payment.findMany({ where: { organizationId: org.id } }),
      prisma.creditNote.findMany({ where: { organizationId: org.id } }),
      prisma.supplier.findMany({ where: { organizationId: org.id } }),
    ]);

    const totalDocumentsProcessed =
      invoices.length + pos.length + grns.length + payments.length + creditNotes.length;

    // Deterministic arithmetic using exact minor units / rounded currency to prevent float drift
    let totalGrossExposure = 0;
    let confirmedSavings = 0;
    let actualRecoveries = 0;
    let highPriorityCount = 0;
    let unappliedCreditsTotal = 0;
    let duplicatePaymentsTotal = 0;

    // Deduplication map by exposureGroupId to strictly prevent double counting
    const exposureGroupMap = new Map<string, number>();

    findings.forEach((f) => {
      totalGrossExposure += f.grossDiscrepancy;
      confirmedSavings += f.confirmedAmount;
      actualRecoveries += f.recoveredAmount;

      if (f.severity === "HIGH" || f.severity === "CRITICAL") {
        highPriorityCount++;
      }

      if (f.category === "UNAPPLIED_CREDIT") {
        unappliedCreditsTotal += f.grossDiscrepancy;
      }

      if (f.category === "DUPLICATE_PAYMENT") {
        duplicatePaymentsTotal += f.grossDiscrepancy;
      }

      const groupId = f.exposureGroupId || f.id;
      const current = exposureGroupMap.get(groupId) || 0;
      if (f.grossDiscrepancy > current) {
        exposureGroupMap.set(groupId, f.grossDiscrepancy);
      }
    });

    let netUniqueExposure = 0;
    exposureGroupMap.forEach((val) => {
      netUniqueExposure += val;
    });

    // Category breakdown
    const categoryCounts: Record<string, { count: number; exposure: number }> = {};
    findings.forEach((f) => {
      if (!categoryCounts[f.category]) {
        categoryCounts[f.category] = { count: 0, exposure: 0 };
      }
      categoryCounts[f.category].count += 1;
      categoryCounts[f.category].exposure = Math.round((categoryCounts[f.category].exposure + f.grossDiscrepancy) * 100) / 100;
    });

    // Supplier exposure ranked
    const supplierExposure: Array<{ name: string; vendorCode: string; exposure: number; findingsCount: number }> = [];
    suppliers.forEach((s) => {
      const sFindings = findings.filter((f) => f.supplierId === s.id);
      const exposure = sFindings.reduce((acc, f) => acc + f.grossDiscrepancy, 0);
      if (sFindings.length > 0 || exposure > 0) {
        supplierExposure.push({
          name: s.legalName,
          vendorCode: s.vendorCode,
          exposure: Math.round(exposure * 100) / 100,
          findingsCount: sFindings.length,
        });
      }
    });
    supplierExposure.sort((a, b) => b.exposure - a.exposure);

    // Aging breakdown for open findings (< 7 days, 7-30 days, > 30 days)
    const now = Date.now();
    let agingUnder7Days = 0;
    let aging7To30Days = 0;
    let agingOver30Days = 0;

    findings.forEach((f) => {
      if (f.status === "OPEN" || f.status === "IN_REVIEW") {
        const days = Math.floor((now - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days < 7) agingUnder7Days++;
        else if (days <= 30) aging7To30Days++;
        else agingOver30Days++;
      }
    });

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        gstin: org.gstin,
        state: org.state,
        currency: org.currency,
      },
      metrics: {
        totalDocumentsProcessed,
        invoicesScanned: invoices.length,
        openFindingsCount: findings.filter((f) => f.status === "OPEN" || f.status === "IN_REVIEW").length,
        totalFindingsCount: findings.length,
        highPriorityCount,
        totalGrossExposure: Math.round(totalGrossExposure * 100) / 100,
        netUniqueExposure: Math.round(netUniqueExposure * 100) / 100,
        confirmedSavings: Math.round(confirmedSavings * 100) / 100,
        actualRecoveries: Math.round(actualRecoveries * 100) / 100,
        unappliedCreditsTotal: Math.round(unappliedCreditsTotal * 100) / 100,
        duplicatePaymentsTotal: Math.round(duplicatePaymentsTotal * 100) / 100,
        reconciliationRatePct:
          invoices.length > 0
            ? Math.round(
                ((invoices.length - findings.filter((f) => f.category !== "COLLUSION_SIGNAL").length) /
                  invoices.length) *
                  100
              )
            : 100,
        agingUnder7Days,
        aging7To30Days,
        agingOver30Days,
      },
      categoryBreakdown: categoryCounts,
      supplierExposure,
      recentFindings: findings.slice(0, 5),
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
