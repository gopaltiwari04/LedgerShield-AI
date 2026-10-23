"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Percent,
  Calendar,
  Coins,
  Lock,
  Sparkles,
} from "lucide-react";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceTolerance, setPriceTolerance] = useState(0.5);
  const [qtyTolerance, setQtyTolerance] = useState(0.0);
  const [approvalLimitINR, setApprovalLimitINR] = useState(50000);
  const [duplicateDays, setDuplicateDays] = useState(60);
  const [savedBanner, setSavedBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        const rList = data.rules || [];

        const pRule = rList.find((r: any) => r.ruleKey === "PRICE_TOLERANCE_PCT");
        if (pRule?.valueFloat !== undefined) setPriceTolerance(pRule.valueFloat);

        const qRule = rList.find((r: any) => r.ruleKey === "QTY_TOLERANCE_PCT");
        if (qRule?.valueFloat !== undefined) setQtyTolerance(qRule.valueFloat);

        const aRule = rList.find((r: any) => r.ruleKey === "APPROVAL_LIMIT_INR");
        if (aRule?.valueFloat !== undefined) setApprovalLimitINR(aRule.valueFloat);

        const dRule = rList.find((r: any) => r.ruleKey === "DUPLICATE_WINDOW_DAYS");
        if (dRule?.valueFloat !== undefined) setDuplicateDays(dRule.valueFloat);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceTolerancePct: priceTolerance,
          quantityTolerancePct: qtyTolerance,
          approvalLimitINR,
          duplicateWindowDays: duplicateDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update rules");

      setSavedBanner(true);
      fetchRules();
      setTimeout(() => setSavedBanner(false), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentVersion = rules[0]?.versionNumber || 1;
  const lastUpdatedBy = rules[0]?.updatedBy || "System Default";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Financial Control Rules & Tolerances
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configurable thresholds, segregation of duties (SOD), and duplicate detection rules (Version {currentVersion} Active)
        </p>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Control tolerances updated and persisted with new version stamp (v{currentVersion}).</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200 flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rules Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-7 space-y-7">
        {/* Section 1: Tolerances */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Reconciliation Tolerances
            </h2>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Policy v{currentVersion} • Modified by: {lastUpdatedBy}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Variances beneath these thresholds will not trigger discrepancy alerts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                <span>Unit Price Variance Tolerance (%)</span>
                <span className="font-mono text-blue-600 font-bold">{priceTolerance}%</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={priceTolerance}
                onChange={(e) => setPriceTolerance(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard benchmark: 0.5% (Accommodates minor fuel/freight adjustments)
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                <span>Quantity Shortfall Tolerance (%)</span>
                <span className="font-mono text-blue-600 font-bold">{qtyTolerance}%</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={qtyTolerance}
                onChange={(e) => setQtyTolerance(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard benchmark: 0.0% (Zero tolerance for unreceived goods)
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                <span>Duplicate Lookback Window (Days)</span>
                <span className="font-mono text-blue-600 font-bold">{duplicateDays} Days</span>
              </label>
              <input
                type="number"
                value={duplicateDays}
                onChange={(e) => setDuplicateDays(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Lookback horizon for matching duplicate invoice numbers or settlement amounts
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Integrity & SOD Controls */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1">
            Approval Limits & Segregation of Duties (SOD)
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Thresholds for dual-signoff and invoice splitting detection.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                <span>Dual Authorization Threshold (₹ INR)</span>
                <span className="font-mono text-blue-600 font-bold">₹{approvalLimitINR.toLocaleString("en-IN")}</span>
              </label>
              <input
                type="number"
                value={approvalLimitINR}
                onChange={(e) => setApprovalLimitINR(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                Purchases above this amount require Level 2 maker-checker approval. Multiple purchases within 15% below this limit trigger splitting alerts.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <span className="font-bold text-slate-800 block flex items-center gap-1.5 font-mono text-[11px] uppercase">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Enforced Governance Policies</span>
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-1.5 text-[11px] leading-relaxed">
                <li>Requisitioner cannot independently approve Purchase Order.</li>
                <li>Warehouse receiver cannot record price/debit note adjustments.</li>
                <li>AP Operator cannot approve disbursements &gt; threshold without CFO signoff.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-brand transition-all cursor-pointer"
          >
            {saving ? "Saving Policy..." : `Save Rule Policy (v${currentVersion + 1})`}
          </button>
        </div>
      </div>
    </div>
  );
}
