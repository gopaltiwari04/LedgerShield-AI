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
  Building2,
  Scale,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
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
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center bg-white p-10 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
        <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200/60 shadow-brand shadow-blue-500/10">
          <GitCompare className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          No Reconciliation Records Yet
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Ingest your purchase orders, tax invoices, and goods receipts into the Document Center to initiate deterministic 3-way and 4-way matching.
        </p>
        <div className="pt-2">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-brand transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Documents in Document Center</span>
          </Link>
        </div>
      </div>
    );
  }

  const current = cases[selectedCaseIndex] || cases[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            3-Way & 4-Way Reconciliation Workbench
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side deterministic alignment across Purchase Order, Tax Invoice, and Goods Receipt (GRN)
          </p>
        </div>

        <div className="relative">
          <select
            value={selectedCaseIndex}
            onChange={(e) => setSelectedCaseIndex(Number(e.target.value))}
            className="text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-subtle focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
          >
            {cases.map((c, idx) => (
              <option key={c.id || idx} value={idx}>
                {c.supplierName} ({c.poNumber}) {c.exposureINR > 0 ? `• ₹${c.exposureINR.toFixed(2)} Variance` : "• Matched"}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Variance Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle ${
          current.exposureINR > 0
            ? "bg-amber-50/80 border-amber-200/90 text-amber-950"
            : "bg-emerald-50/80 border-emerald-200/90 text-emerald-950"
        }`}
      >
        <div className="flex items-start gap-3.5">
          {current.exposureINR > 0 ? (
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="text-sm font-extrabold tracking-tight">
              {current.exposureINR > 0
                ? `Discrepancy Detected: ${formatINR(current.exposureINR)}`
                : "Deterministic 3-Way Match Verified"}
            </div>
            <div className="text-xs mt-1 leading-relaxed opacity-90 max-w-2xl">
              {current.varianceExplanation}
            </div>
          </div>
        </div>

        {current.exposureINR > 0 && (
          <div className="shrink-0 sm:text-right bg-white/70 p-3 rounded-xl border border-amber-200/60">
            <span className="text-[10px] block font-mono uppercase text-amber-800">
              Recoverable Exposure
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-amber-950">
              {formatINR(current.exposureINR)}
            </span>
          </div>
        )}
      </div>

      {/* Side-by-Side 3-Way Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document 1: Purchase Order */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">1. Purchase Order (PO)</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
              {current.po?.number}
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs flex-1">
            <div>
              <span className="text-slate-400 block text-[11px] font-mono">Approved Description</span>
              <span className="font-bold text-slate-900">{current.po?.item}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
              <div>
                <span className="text-slate-400 block text-[11px]">Ordered Qty</span>
                <span className="font-extrabold text-slate-900">{current.po?.quantity} PCS</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Authorized Unit Rate</span>
                <span className="font-extrabold text-emerald-700">{formatINR(current.po?.unitPrice)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
              <div>
                <span className="text-slate-400 block text-[11px]">Tax (18% GST)</span>
                <span className="font-bold text-slate-800">{formatINR(current.po?.tax)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PO Total</span>
                <span className="font-black text-slate-900">{formatINR(current.po?.total)}</span>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
              Date: {current.po?.date} • Status: <span className="text-emerald-600 font-bold">{current.po?.status}</span>
            </div>
          </div>
        </div>

        {/* Document 2: Supplier Tax Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">2. Tax Invoice</span>
            </div>
            <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
              {current.invoice?.number || "NO INVOICE"}
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs flex-1">
            {current.invoice ? (
              <>
                <div>
                  <span className="text-slate-400 block text-[11px] font-mono">Billed Item Description</span>
                  <span className="font-bold text-slate-900">{current.invoice.item}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Billed Qty</span>
                    <span
                      className={`font-extrabold ${
                        current.grn && current.invoice.quantity !== current.grn.acceptedQty
                          ? "text-rose-600 underline"
                          : "text-slate-900"
                      }`}
                    >
                      {current.invoice.quantity} PCS
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Billed Unit Rate</span>
                    <span
                      className={`font-extrabold ${
                        current.invoice.unitPrice !== current.po?.unitPrice && !current.po?.hasAmendment
                          ? "text-rose-600 underline"
                          : "text-slate-900"
                      }`}
                    >
                      {formatINR(current.invoice.unitPrice)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tax (18% GST)</span>
                    <span className="font-bold text-slate-800">{formatINR(current.invoice.tax)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Invoice Total</span>
                    <span
                      className={`font-black ${
                        current.invoice.total !== current.po?.total && !current.po?.hasAmendment
                          ? "text-rose-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatINR(current.invoice.total)}
                    </span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Date: {current.invoice.date} • Paid: <span className="font-bold">{formatINR(current.invoice.paidAmount)}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 py-12 text-center">No invoice matched to this purchase order.</div>
            )}
          </div>
        </div>

        {/* Document 3: Warehouse Goods Receipt Note (GRN) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">3. Goods Receipt (GRN)</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold truncate max-w-[120px]">
              {current.grn?.numbers || "NO GRN"}
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs flex-1">
            {current.grn ? (
              <>
                <div>
                  <span className="text-slate-400 block text-[11px] font-mono">Receiving Inspector / Bay</span>
                  <span className="font-bold text-slate-900">{current.grn.receivedBy}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Physically Received</span>
                    <span className="font-extrabold text-slate-900">{current.grn.receivedQty} PCS</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Accepted in Stock</span>
                    <span
                      className={`font-extrabold ${
                        current.invoice && current.grn.acceptedQty < current.invoice.quantity
                          ? "text-rose-600 underline"
                          : "text-emerald-700"
                      }`}
                    >
                      {current.grn.acceptedQty} PCS
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Rejected Damaged</span>
                    <span className="font-bold text-slate-800">{current.grn.rejectedQty} PCS</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Physical Shortfall</span>
                    <span className="font-black text-rose-600">
                      {current.invoice ? Math.max(0, current.invoice.quantity - current.grn.acceptedQty) : 0} PCS
                    </span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Receipt Date: {current.grn.date} • Gate Pass Verified
                </div>
              </>
            ) : (
              <div className="text-slate-400 py-12 text-center">No Goods Receipt Note recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
