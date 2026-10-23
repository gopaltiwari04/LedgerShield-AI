import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: session.organizationId }, // Strict Tenant Scoping
      include: {
        bankAccounts: true,
        purchaseOrders: true,
        invoices: true,
        goodsReceipts: true,
        creditNotes: true,
        payments: true,
        findings: true,
      },
      orderBy: { legalName: "asc" },
    });

    const supplierCards = suppliers.map((s) => {
      const totalInvoiced = s.invoices.reduce((acc, i) => acc + i.totalAmount, 0);
      const totalPaid = s.payments.reduce((acc, p) => acc + p.amount, 0);
      const openCredits = s.creditNotes
        .filter((c) => !c.isApplied)
        .reduce((acc, c) => acc + c.amount, 0);
      const totalDiscrepancy = s.findings.reduce((acc, f) => acc + f.grossDiscrepancy, 0);

      return {
        id: s.id,
        vendorCode: s.vendorCode,
        name: s.legalName,
        email: s.email,
        bankAccount: s.bankAccounts[0]?.accountNumber || "N/A",
        ifscCode: s.bankAccounts[0]?.ifscCode || "N/A",
        totalOrders: s.purchaseOrders.length,
        totalInvoices: s.invoices.length,
        totalInvoicedINR: Math.round(totalInvoiced * 100) / 100,
        totalPaidINR: Math.round(totalPaid * 100) / 100,
        openCreditsINR: Math.round(openCredits * 100) / 100,
        totalDiscrepancyINR: Math.round(totalDiscrepancy * 100) / 100,
        findingsCount: s.findings.length,
        riskScore: s.findings.length > 1 ? 75 : s.findings.length === 1 ? 40 : 10,
      };
    });

    return NextResponse.json({ suppliers: supplierCards });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
