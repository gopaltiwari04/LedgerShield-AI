import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "LEAKAGE_SUMMARY";
    const format = searchParams.get("format") || "csv";

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
    });

    const findings = await prisma.discrepancyFinding.findMany({
      where: { organizationId: session.organizationId }, // Strict Tenant Scoping
      include: { supplier: true, evidences: true, riskSignals: true },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      const headers = [
        "Finding Code",
        "Category",
        "Severity",
        "Status",
        "Supplier",
        "Invoice Reference",
        "PO Reference",
        "Gross Discrepancy (INR)",
        "Potential Recoverable (INR)",
        "Confirmed Savings (INR)",
        "Actual Recovered (INR)",
        "Risk Score",
        "Deterministic Variance Formula",
        "Recommended Action",
      ];

      const rows = findings.map((f) => [
        `"${f.findingCode}"`,
        `"${f.category}"`,
        `"${f.severity}"`,
        `"${f.status}"`,
        `"${f.supplier?.legalName || "N/A"}"`,
        `"${f.invoiceNumber || "N/A"}"`,
        `"${f.poNumber || "N/A"}"`,
        f.grossDiscrepancy.toFixed(2),
        f.potentialRecoverable.toFixed(2),
        f.confirmedAmount.toFixed(2),
        f.recoveredAmount.toFixed(2),
        f.compositeRiskScore,
        `"${(f.varianceCalculation || "").replace(/"/g, '""')}"`,
        `"${(f.recommendedAction || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="LedgerShield_${type}_Report_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      reportType: type,
      generatedAt: new Date().toISOString(),
      organization: {
        id: org?.id,
        name: org?.name,
        currency: org?.currency,
        gstin: org?.gstin,
      },
      totalFindings: findings.length,
      netUniqueExposure: findings.reduce((acc, f) => acc + f.potentialRecoverable, 0),
      confirmedSavings: findings.reduce((acc, f) => acc + f.confirmedAmount, 0),
      actualRecovered: findings.reduce((acc, f) => acc + f.recoveredAmount, 0),
      findings,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
