"use client";

import { useEffect, useState } from "react";
import { Sliders, ShieldCheck, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";

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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Financial Control Rules & Tolerances
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configurable thresholds, segregation of duties (SOD), and duplicate detection rules (Version {currentVersion} Active)
        </p>
      </div>

      {savedBanner && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Control tolerances updated and persisted with new version stamp (v{currentVersion}).</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs font-medium border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Rules Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section 1: Tolerances */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-bold text-slate-900">Reconciliation Tolerances</h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Version: v{currentVersion} • Modified by: {lastUpdatedBy}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Variances beneath these thresholds will not trigger discrepancy alerts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Unit Price Tolerance (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={priceTolerance}
                onChange={(e) => setPriceTolerance(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: 0.5% (Allows minor fuel/tariff fluctuations)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Quantity Discrepancy Tolerance (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={qtyTolerance}
                onChange={(e) => setQtyTolerance(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: 0.0% (Zero tolerance for unreceived goods)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Duplicate Lookback Window (Days)
              </label>
              <input
                type="number"
                value={duplicateDays}
                onChange={(e) => setDuplicateDays(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Lookback period for matching duplicate invoice numbers or amounts</span>
            </div>
          </div>
        </div>

        {/* Section 2: Integrity & SOD Controls */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Approval Limits & Segregation of Duties</h2>
          <p className="text-xs text-slate-500 mb-4">
            Thresholds for dual-signoff and invoice splitting detection.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Dual Authorization Threshold (₹ INR)
              </label>
              <input
                type="number"
                value={approvalLimitINR}
                onChange={(e) => setApprovalLimitINR(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Purchases above this amount require Level 2 approval. Multiple purchases within 15% below this limit trigger splitting alerts.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 block">Enforced SOD Policies:</span>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                <li>Requisitioner cannot independently approve Purchase Order.</li>
                <li>Warehouse receiver cannot record price/debit note adjustments.</li>
                <li>AP Operator cannot approve disbursements &gt; threshold without Manager signoff.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {saving ? "Saving Policy..." : `Save Rule Policy (v${currentVersion + 1})`}
          </button>
        </div>
      </div>
    </div>
  );
}
