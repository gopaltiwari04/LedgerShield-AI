import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { formatINR } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    // Fetch POs, Invoices, GRNs, Payments for this organization
    const [pos, invoices, grns, payments] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { organizationId: session.organizationId },
        include: { lines: true, amendments: true, supplier: true },
        orderBy: { poDate: "desc" },
      }),
      prisma.invoice.findMany({
        where: { organizationId: session.organizationId },
        include: { lines: true, supplier: true, paymentAllocations: { include: { payment: true } } },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.goodsReceipt.findMany({
        where: { organizationId: session.organizationId },
        include: { lines: true, supplier: true },
        orderBy: { grnDate: "desc" },
      }),
      prisma.payment.findMany({
        where: { organizationId: session.organizationId },
        include: { supplier: true },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    // Build side-by-side reconciliation cases
    const reconciliationCases = pos.map((po) => {
      const matchingInvoices = invoices.filter(
        (i) => (i.purchaseOrderId === po.id || (po.poNumber && i.lines.some((l) => l.itemDescription === po.lines[0]?.itemDescription)))
      );
      const matchingGrns = grns.filter((g) => g.purchaseOrderId === po.id);

      const firstInvoice = matchingInvoices[0];
      const poLine = po.lines[0];
      const invLine = firstInvoice?.lines[0];

      let varianceType = "MATCHED";
      let varianceExplanation = "Purchase Order, Invoice, and Goods Receipt match within approved tolerances.";
      let exposureINR = 0;

      if (firstInvoice && poLine && invLine) {
        if (invLine.unitPrice > poLine.unitPrice && (!po.amendments || po.amendments.length === 0)) {
          varianceType = "PRICE_OVERCHARGE";
          const diff = invLine.unitPrice - poLine.unitPrice;
          const gross = diff * invLine.billedQuantity * 1.18;
          exposureINR = Math.round(gross * 100) / 100;
          varianceExplanation = `Invoice rate (₹${invLine.unitPrice.toFixed(2)}) exceeds approved PO rate (₹${poLine.unitPrice.toFixed(2)}) by ₹${diff.toFixed(2)}/unit. Net exposure: ${formatINR(exposureINR)}.`;
        }

        const totalAccepted = matchingGrns.reduce((acc, g) => {
          const gl = g.lines.find((l) => l.itemDescription === invLine.itemDescription);
          return acc + (gl ? gl.acceptedQuantity : 0);
        }, 0);

        if (totalAccepted < invLine.billedQuantity && matchingGrns.length > 0) {
          varianceType = "QUANTITY_SHORTAGE";
          const shortfall = invLine.billedQuantity - totalAccepted;
          const gross = shortfall * poLine.unitPrice * 1.18;
          exposureINR = Math.round(gross * 100) / 100;
          varianceExplanation = `Supplier billed for ${invLine.billedQuantity} units, but warehouse accepted only ${totalAccepted} units across ${matchingGrns.length} receipt(s). Shortfall of ${shortfall} units = ${formatINR(exposureINR)}.`;
        }
      }

      return {
        id: po.id,
        poNumber: po.poNumber,
        supplierName: po.supplier.legalName,
        vendorCode: po.supplier.vendorCode,
        po: {
          number: po.poNumber,
          date: po.poDate.toISOString().split("T")[0],
          item: poLine?.itemDescription || "N/A",
          quantity: poLine?.orderedQuantity || 0,
          unitPrice: poLine?.unitPrice || 0,
          subtotal: po.subtotal,
          tax: po.taxAmount,
          total: po.totalAmount,
          status: po.status,
          hasAmendment: po.amendments.length > 0,
        },
        invoice: firstInvoice
          ? {
              number: firstInvoice.invoiceNumber,
              date: firstInvoice.invoiceDate.toISOString().split("T")[0],
              item: invLine?.itemDescription || "N/A",
              quantity: invLine?.billedQuantity || 0,
              unitPrice: invLine?.unitPrice || 0,
              subtotal: firstInvoice.subtotal,
              tax: firstInvoice.totalTaxAmount,
              total: firstInvoice.totalAmount,
              paidAmount: firstInvoice.paidAmount,
              status: firstInvoice.status,
            }
          : null,
        grn: matchingGrns.length > 0
          ? {
              numbers: matchingGrns.map((g) => g.grnNumber).join(", "),
              date: matchingGrns[0].grnDate.toISOString().split("T")[0],
              receivedQty: matchingGrns.reduce((acc, g) => acc + g.lines.reduce((lacc, l) => lacc + l.receivedQuantity, 0), 0),
              acceptedQty: matchingGrns.reduce((acc, g) => acc + g.lines.reduce((lacc, l) => lacc + l.acceptedQuantity, 0), 0),
              rejectedQty: matchingGrns.reduce((acc, g) => acc + g.lines.reduce((lacc, l) => lacc + l.rejectedQuantity, 0), 0),
              receivedBy: matchingGrns[0].receivedBy || "Warehouse Staff",
            }
          : null,
        varianceType,
        varianceExplanation,
        exposureINR,
      };
    });

    return NextResponse.json({
      cases: reconciliationCases,
      summary: {
        totalOrders: pos.length,
        totalInvoices: invoices.length,
        totalGrns: grns.length,
        totalPayments: payments.length,
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
