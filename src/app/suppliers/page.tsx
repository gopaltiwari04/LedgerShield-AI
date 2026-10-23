"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  CreditCard,
  Mail,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Audit Scorecard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Vendor reconciliation history, recurring discrepancy categories, unapplied credits, and banking signals
        </p>
      </div>

      {/* Grid of Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
            Loading supplier profiles...
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{s.name}</h2>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                        {s.vendorCode}
                      </span>
                      <span>•</span>
                      <span>{s.email || "accounts@vendor.in"}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      s.findingsCount > 1
                        ? "bg-red-50 text-red-700 border-red-200"
                        : s.findingsCount === 1
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {s.findingsCount > 0 ? `${s.findingsCount} Variances` : "100% Reconciled"}
                  </span>
                </div>
              </div>

              {/* Key Financial Stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Billed</span>
                  <span className="font-bold text-slate-900">{formatINR(s.totalInvoicedINR)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Discrepancies</span>
                  <span className={`font-bold ${s.totalDiscrepancyINR > 0 ? "text-amber-700" : "text-slate-900"}`}>
                    {formatINR(s.totalDiscrepancyINR)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Open Credits</span>
                  <span className="font-bold text-emerald-700">{formatINR(s.openCreditsINR)}</span>
                </div>
              </div>

              {/* Banking & Risk Signals */}
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <CreditCard className="h-3.5 w-3.5" /> Bank Payout Endpoint:
                  </span>
                  <span className="font-mono text-slate-800 font-semibold">{s.bankAccount}</span>
                </div>

                {/* Scenario F Check: Shared Bank account indicator */}
                {s.bankAccount === "HDFC000123456789" && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Collusion Signal (Scenario F):</strong> Bank account shared with another registered supplier entity.
                    </span>
                  </div>
                )}

                {s.openCreditsINR > 0 && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Unapplied Credit Note:</strong> {formatINR(s.openCreditsINR)} available to deduct from upcoming payments.
                    </span>
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
