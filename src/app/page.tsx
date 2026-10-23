"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  AlertTriangle,
  Receipt,
  RotateCcw,
  ChevronRight,
  CheckCircle,
  FileText,
  UploadCloud,
  Users,
  Building2,
  Calendar,
} from "lucide-react";
import { formatINR, formatCompactINR } from "@/lib/currency";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm">Loading verified financial leakage metrics...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const supplierExposure = data?.supplierExposure || [];
  const categoryBreakdown = data?.categoryBreakdown || {};
  const isNewOrg = metrics.totalDocumentsProcessed === 0 && metrics.totalFindingsCount === 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Onboarding Guide for New Organizations */}
      {isNewOrg ? (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-8 text-white shadow-lg border border-blue-700/50">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full inline-block mb-3">
              Workspace Initialized
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Welcome to {data?.organization?.name || "your new workspace"}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Your multi-tenant workspace is initialized and completely isolated. Start by uploading purchase orders, tax invoices, and goods receipts to run your first reconciliation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/documents"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex flex-col items-start gap-2"
              >
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="font-bold text-xs text-white">1. Ingest Documents</div>
                <div className="text-[11px] text-slate-400">Upload CSV, XLSX, or PDF invoices and POs</div>
              </Link>

              <Link
                href="/team"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex flex-col items-start gap-2"
              >
                <div className="p-2 rounded-lg bg-purple-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div className="font-bold text-xs text-white">2. Invite Team</div>
                <div className="text-[11px] text-slate-400">Add Auditors, AP operators, and managers</div>
              </Link>

              <Link
                href="/rules"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex flex-col items-start gap-2"
              >
                <div className="p-2 rounded-lg bg-emerald-600 text-white">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="font-bold text-xs text-white">3. Configure Tolerances</div>
                <div className="text-[11px] text-slate-400">Review price and approval limits</div>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Top Banner: Active Workspace Overview */
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-700">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
              <span>Deterministic 3-Way Reconciliation + Procurement Integrity</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Financial Leakage & Procurement Audit
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Real-time audit across Purchase Orders, Tax Invoices, Goods Receipts, Credit Notes, and Bank Settlements for {data?.organization?.name}. Every finding is verified by deterministic evidence.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Primary Exposure</span>
                <span className="font-semibold text-amber-300">Price & Qty Variances</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Duplicate Protection</span>
                <span className="font-semibold text-emerald-400">Payment & Hash Dedup</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Unclaimed Value</span>
                <span className="font-semibold text-blue-300">Unapplied Credit Notes</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Integrity Controls</span>
                <span className="font-semibold text-purple-300">Splitting & Collusion</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Net Recoverable Exposure */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Net Financial Exposure</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(metrics.netUniqueExposure || 0)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-amber-700 font-medium">Double-count deduplicated</span>
            <span>Gross: {formatCompactINR(metrics.totalGrossExposure || 0)}</span>
          </div>
        </div>

        {/* Card 2: High Priority Findings */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>High & Critical Findings</span>
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.highPriorityCount || 0} <span className="text-xs font-normal text-slate-500">of {metrics.totalFindingsCount || 0} open</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-red-600 font-medium">Immediate action needed</span>
            <Link href="/findings?severity=CRITICAL" className="text-blue-600 hover:underline">
              View queue →
            </Link>
          </div>
        </div>

        {/* Card 3: Unapplied Supplier Credits */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Unapplied Supplier Credits</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(metrics.unappliedCreditsTotal || 0)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 font-medium">100% Recoverable in AP</span>
            <Link href="/findings?category=UNAPPLIED_CREDIT" className="text-blue-600 hover:underline">
              Apply credit →
            </Link>
          </div>
        </div>

        {/* Card 4: Duplicate Payments Identified */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Duplicate Payments Detected</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(metrics.duplicatePaymentsTotal || 0)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-blue-700 font-medium">Refund / Clawback lead</span>
            <Link href="/findings?category=DUPLICATE_PAYMENT" className="text-blue-600 hover:underline">
              View clawback →
            </Link>
          </div>
        </div>
      </div>

      {/* Financial Recovery Pipeline & Lifecycle */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Financial Leakage Recovery Pipeline</h2>
            <p className="text-xs text-slate-500">
              Transparent separation of potential exposure, disputed balances, confirmed savings, and collected cash.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-medium">
            Maker-Checker Governance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">1. Gross Identified Exposure</div>
            <div className="text-xl font-bold text-slate-900">{formatINR(metrics.totalGrossExposure || 0)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Total variances detected</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80">
            <div className="text-xs text-amber-700 mb-1">2. Net Unique Disputed</div>
            <div className="text-xl font-bold text-amber-900">{formatINR(metrics.netUniqueExposure || 0)}</div>
            <div className="text-[11px] text-amber-700 mt-1">Zero double-counting pool</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200/80">
            <div className="text-xs text-blue-700 mb-1">3. Confirmed by Auditor</div>
            <div className="text-xl font-bold text-blue-900">{formatINR(metrics.confirmedSavings || 0)}</div>
            <div className="text-[11px] text-blue-700 mt-1">Verified with documents</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <div className="text-xs text-emerald-700 mb-1">4. Actually Recovered</div>
            <div className="text-xl font-bold text-emerald-900">{formatINR(metrics.actualRecoveries || 0)}</div>
            <div className="text-[11px] text-emerald-700 mt-1">Cash refunded or offset in AP</div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Category Distribution & Recent Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Exposure Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supplier Financial Exposure Scorecard</h3>
                <p className="text-xs text-slate-500">Ranked by potential financial recovery opportunities</p>
              </div>
              <Link href="/suppliers" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Full Vendor Scorecard <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Supplier Entity</th>
                    <th className="py-3 px-4">Vendor Code</th>
                    <th className="py-3 px-4">Open Findings</th>
                    <th className="py-3 px-6 text-right">Potential Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {supplierExposure.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No supplier records on file yet.
                      </td>
                    </tr>
                  ) : (
                    supplierExposure.map((sup: any) => (
                      <tr key={sup.vendorCode} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-900">
                          {sup.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{sup.vendorCode}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {sup.findingsCount} findings
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-semibold text-slate-900">
                          {formatINR(sup.exposure)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Findings Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Discrepancies Requiring Review</h3>
                <p className="text-xs text-slate-500">Corroborated by deterministic document evidence</p>
              </div>
              <Link href="/findings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All Findings <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.recentFindings?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No discrepancy findings detected. All records are currently reconciled.
                </div>
              ) : (
                data?.recentFindings?.map((f: any) => (
                  <Link
                    key={f.id}
                    href={`/findings/${f.id}`}
                    className="p-4 block hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {f.findingCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            f.severity === "CRITICAL"
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : f.severity === "HIGH"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate max-w-sm">
                          {f.title}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {formatINR(f.grossDiscrepancy)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-1">{f.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Vendor: {f.supplier?.legalName || "Multiple"}</span>
                      <span>Risk Score: <strong className="text-slate-700">{f.compositeRiskScore}/100</strong></span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Aging & Category Breakdown */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Findings by Category</h3>
            <div className="space-y-3 text-xs">
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div className="text-slate-400 text-center py-4">No categories recorded yet.</div>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, info]: any) => (
                  <div key={cat} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-800">{cat.replace(/_/g, " ")}</span>
                      <span className="font-bold text-slate-900">{formatINR(info.exposure)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{info.count} active finding(s)</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Investigation Backlog Aging</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-lg font-bold text-emerald-800 block">{metrics.agingUnder7Days || 0}</span>
                <span className="text-[10px] text-emerald-600">&lt; 7 Days</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-lg font-bold text-amber-800 block">{metrics.aging7To30Days || 0}</span>
                <span className="text-[10px] text-amber-600">7 - 30 Days</span>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                <span className="text-lg font-bold text-red-800 block">{metrics.agingOver30Days || 0}</span>
                <span className="text-[10px] text-red-600">&gt; 30 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
