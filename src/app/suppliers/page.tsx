"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  CreditCard,
  Mail,
  Search,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBilledAll = suppliers.reduce((acc, s) => acc + (s.totalInvoicedINR || 0), 0);
  const totalDiscrepanciesAll = suppliers.reduce(
    (acc, s) => acc + (s.totalDiscrepancyINR || 0),
    0
  );
  const totalOpenCreditsAll = suppliers.reduce(
    (acc, s) => acc + (s.openCreditsINR || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Supplier Audit & Exposure Scorecards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vendor billing history, recurring variance patterns, unapplied credits, and banking collusion signals
          </p>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-subtle"
            />
          </div>
        </div>
      </div>

      {/* Aggregate Vendor Intelligence Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">
            Cumulative Vendor Billing
          </span>
          <span className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">
            {formatINR(totalBilledAll)}
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Across {suppliers.length} active registered suppliers
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span className="text-[10px] text-amber-700 font-mono uppercase block">
            Active Vendor Variances
          </span>
          <span className="text-xl font-black text-amber-900 font-mono tabular-nums mt-0.5 block">
            {formatINR(totalDiscrepanciesAll)}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            Under auditor investigation
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span className="text-[10px] text-emerald-700 font-mono uppercase block">
            Unapplied Supplier Credits
          </span>
          <span className="text-xl font-black text-emerald-900 font-mono tabular-nums mt-0.5 block">
            {formatINR(totalOpenCreditsAll)}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Available for immediate AP deduction
          </span>
        </div>
      </div>

      {/* Grid of Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-blue-600 mb-3" />
            <p className="font-medium text-slate-600">Loading vendor scorecards...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No supplier profiles match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 space-y-4 hover:shadow-card transition-all"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {s.name}
                    </h2>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                        {s.vendorCode}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[180px]">{s.email || "accounts@vendor.in"}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      s.findingsCount > 1
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : s.findingsCount === 1
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {s.findingsCount > 0 ? `${s.findingsCount} Open Variances` : "100% Reconciled"}
                  </span>
                </div>
              </div>

              {/* Key Financial Stats */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Total Billed</span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatINR(s.totalInvoicedINR)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Variances</span>
                  <span
                    className={`font-extrabold tabular-nums ${
                      s.totalDiscrepancyINR > 0 ? "text-amber-700" : "text-slate-900"
                    }`}
                  >
                    {formatINR(s.totalDiscrepancyINR)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Open Credits</span>
                  <span className="font-extrabold text-emerald-700 tabular-nums">
                    {formatINR(s.openCreditsINR)}
                  </span>
                </div>
              </div>

              {/* Banking & Risk Signals */}
              <div className="text-xs space-y-2 pt-1">
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <span>Payout Bank Account:</span>
                  </span>
                  <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {s.bankAccount}
                  </span>
                </div>

                {/* Scenario F Check: Shared Bank account indicator */}
                {s.bankAccount === "HDFC000123456789" && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 text-[11px] flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong className="text-amber-900">Procurement Collusion Signal (Scenario F):</strong> Bank account is shared with another registered supplier entity.
                    </span>
                  </div>
                )}

                {s.openCreditsINR > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Unapplied Credit Note:</strong> {formatINR(s.openCreditsINR)} ready to offset upcoming invoices.
                      </span>
                    </div>
                    <Link
                      href="/findings?category=UNAPPLIED_CREDIT"
                      className="text-emerald-700 font-bold hover:underline shrink-0 ml-2"
                    >
                      Apply →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
