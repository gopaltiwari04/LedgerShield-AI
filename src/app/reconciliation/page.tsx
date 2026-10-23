"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GitCompare,
  FileText,
  Truck,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  Building,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function ReconciliationWorkspacePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    try {
      const res = await fetch("/api/reconciliation");
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 text-xs">
        Loading reconciliation records from database...
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-full inline-block">
          <GitCompare className="h-8 w-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Reconciliation Records Yet</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ingest your purchase orders, tax invoices, and goods receipts into the Document Center to run 3-way and 4-way reconciliation.
        </p>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Documents in Document Center</span>
        </Link>
      </div>
    );
  }

  const current = cases[selectedCaseIndex] || cases[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Multi-Document Reconciliation Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side 3-way & 4-way matching of Purchase Orders, Invoices, Goods Receipts, and Payments
          </p>
        </div>

        <div>
          <select
            value={selectedCaseIndex}
            onChange={(e) => setSelectedCaseIndex(Number(e.target.value))}
            className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {cases.map((c, idx) => (
              <option key={c.id || idx} value={idx}>
                {c.supplierName} ({c.poNumber}) {c.exposureINR > 0 ? `• ₹${c.exposureINR.toFixed(2)} Variance` : "• Matched"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Variance Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
          current.exposureINR > 0
            ? "bg-amber-50/80 border-amber-200 text-amber-950"
            : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
        }`}
      >
        <div className="flex items-start gap-3">
          {current.exposureINR > 0 ? (
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-sm font-bold">
              {current.exposureINR > 0
                ? `Financial Variance Detected: ${formatINR(current.exposureINR)}`
                : "Fully Reconciled & Validated"}
            </div>
            <div className="text-xs mt-1 leading-relaxed">{current.varianceExplanation}</div>
          </div>
        </div>

        {current.exposureINR > 0 && (
          <div className="shrink-0 text-right">
            <span className="text-[11px] block font-medium opacity-80">Recoverable Exposure</span>
            <span className="text-lg font-bold">{formatINR(current.exposureINR)}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side 3-Way Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document 1: Purchase Order */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">1. Purchase Order (PO)</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
              {current.po?.number}
            </span>
          </div>
          <div className="p-4 space-y-3 text-xs flex-1">
            <div>
              <span className="text-slate-400 block text-[11px]">Approved Item Description</span>
              <span className="font-semibold text-slate-900">{current.po?.item}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Ordered Qty</span>
                <span className="font-semibold text-slate-900">{current.po?.quantity} PCS</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Approved Unit Rate</span>
                <span className="font-semibold text-emerald-700">{formatINR(current.po?.unitPrice)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Tax Amount (18%)</span>
                <span className="font-semibold text-slate-900">{formatINR(current.po?.tax)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PO Total Amount</span>
                <span className="font-bold text-slate-900">{formatINR(current.po?.total)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Approved Date: {current.po?.date} • Status: <span className="text-emerald-600 font-semibold">{current.po?.status}</span>
            </div>
          </div>
        </div>

        {/* Document 2: Supplier Tax Invoice */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">2. Tax Invoice</span>
            </div>
            <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
              {current.invoice?.number || "NO INVOICE"}
            </span>
          </div>
          <div className="p-4 space-y-3 text-xs flex-1">
            {current.invoice ? (
              <>
                <div>
                  <span className="text-slate-400 block text-[11px]">Billed Item Description</span>
                  <span className="font-semibold text-slate-900">{current.invoice.item}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Billed Qty</span>
                    <span
                      className={`font-semibold ${
                        current.grn && current.invoice.quantity !== current.grn.acceptedQty
                          ? "text-red-600 underline font-bold"
                          : "text-slate-900"
                      }`}
                    >
                      {current.invoice.quantity} PCS
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Billed Unit Rate</span>
                    <span
                      className={`font-semibold ${
                        current.invoice.unitPrice !== current.po?.unitPrice && !current.po?.hasAmendment
                          ? "text-red-600 underline font-bold"
                          : "text-slate-900"
                      }`}
                    >
                      {formatINR(current.invoice.unitPrice)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tax Amount (18%)</span>
                    <span className="font-semibold text-slate-900">{formatINR(current.invoice.tax)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Invoice Total</span>
                    <span
                      className={`font-bold ${
                        current.invoice.total !== current.po?.total && !current.po?.hasAmendment
                          ? "text-red-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatINR(current.invoice.total)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Invoice Date: {current.invoice.date} • Paid: <span className="font-semibold">{formatINR(current.invoice.paidAmount)}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 py-8 text-center">No invoice linked to this purchase order.</div>
            )}
          </div>
        </div>

        {/* Document 3: Warehouse Goods Receipt Note (GRN) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">3. Goods Receipt (GRN)</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold truncate max-w-[120px]">
              {current.grn?.numbers || "NO GRN"}
            </span>
          </div>
          <div className="p-4 space-y-3 text-xs flex-1">
            {current.grn ? (
              <>
                <div>
                  <span className="text-slate-400 block text-[11px]">Receiving Inspector / Bay</span>
                  <span className="font-semibold text-slate-900">{current.grn.receivedBy}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Physically Received</span>
                    <span className="font-semibold text-slate-900">{current.grn.receivedQty} PCS</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Accepted in Stock</span>
                    <span
                      className={`font-semibold ${
                        current.invoice && current.grn.acceptedQty < current.invoice.quantity
                          ? "text-red-600 underline font-bold"
                          : "text-emerald-700"
                      }`}
                    >
                      {current.grn.acceptedQty} PCS
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Rejected Damaged</span>
                    <span className="font-semibold text-slate-900">{current.grn.rejectedQty} PCS</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Physical Shortfall</span>
                    <span className="font-bold text-slate-900">
                      {current.invoice ? Math.max(0, current.invoice.quantity - current.grn.acceptedQty) : 0} PCS
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Receipt Date: {current.grn.date} • Gate Pass Verified
                </div>
              </>
            ) : (
              <div className="text-slate-400 py-8 text-center">No Goods Receipt Note recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
