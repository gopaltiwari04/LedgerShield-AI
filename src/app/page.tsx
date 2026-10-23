"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  AlertTriangle,
  Receipt,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  FileText,
  UploadCloud,
  Users,
  Building2,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle,
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
      console.error("Dashboard stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        {/* Skeleton Header */}
        <div className="h-32 rounded-2xl bg-slate-200/70 border border-slate-200" />
        {/* Skeleton Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200/70 border border-slate-200" />
          ))}
        </div>
        {/* Skeleton Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-slate-200/70 border border-slate-200" />
          <div className="h-96 rounded-2xl bg-slate-200/70 border border-slate-200" />
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const supplierExposure = data?.supplierExposure || [];
  const categoryBreakdown = data?.categoryBreakdown || {};
  const isNewOrg =
    metrics.totalDocumentsProcessed === 0 && metrics.totalFindingsCount === 0;

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Onboarding Guide for New Organizations */}
      {isNewOrg ? (
        <div className="bg-gradient-to-br from-[#0B132B] via-[#0F1E36] to-[#0A101D] rounded-2xl p-8 text-white shadow-elevated border border-blue-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-[11px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Workspace Provisioned & Encrypted
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Welcome to {data?.organization?.name || "your organization"}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
              Your multi-tenant workspace is active with complete cryptographic data isolation. Ingest your POs, tax invoices, goods receipts, and bank files to run deterministic 3-way matching.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Link
                href="/documents"
                className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col items-start gap-2.5 group"
              >
                <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-brand shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="font-bold text-xs text-white">1. Ingest Invoices & POs</div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Upload CSV, XLSX, TSV or PDF invoices
                </div>
              </Link>

              <Link
                href="/team"
                className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col items-start gap-2.5 group"
              >
                <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <Users className="h-4 w-4" />
                </div>
                <div className="font-bold text-xs text-white">2. Invite AP Team</div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Configure auditors and CFO maker-checker
                </div>
              </Link>

              <Link
                href="/rules"
                className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col items-start gap-2.5 group"
              >
                <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div className="font-bold text-xs text-white">3. Review Tolerances</div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Adjust price and quantity thresholds
                </div>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Top Executive Hero Banner */
        <div className="bg-gradient-to-r from-[#0A101D] via-[#0F1E36] to-[#0A101D] rounded-2xl p-6 sm:p-7 text-white shadow-elevated relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Deterministic 3-Way Reconciliation & Forensic Audit Active</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Executive Financial Posture: {data?.organization?.name}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Autonomous reconciliation across Purchase Orders, Delivery Challans, Tax Invoices, and Bank Settlements. Every finding is corroborated by mathematical and document proof.
              </p>
            </div>

            {/* Quick Metrics Badge Array */}
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
              <div className="text-left md:text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">
                  Reconciliation Health
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                  {metrics.reconciliationRatePct || 100}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  {metrics.invoicesScanned || 0} Invoices
                </span>
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  {metrics.totalDocumentsProcessed || 0} Docs
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Net Recoverable Exposure */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Net Financial Exposure</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 group-hover:scale-105 transition-transform">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {formatINR(metrics.netUniqueExposure || 0)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded">
              Deduplicated
            </span>
            <span className="font-mono">Gross: {formatCompactINR(metrics.totalGrossExposure || 0)}</span>
          </div>
        </div>

        {/* Card 2: Confirmed & Recovered Savings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Verified Savings Recovered</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight font-mono tabular-nums">
            {formatINR(metrics.actualRecoveries || 0)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 font-semibold">Realized in Cash / AP</span>
            <span className="font-mono">Confirmed: {formatCompactINR(metrics.confirmedSavings || 0)}</span>
          </div>
        </div>

        {/* Card 3: Critical Findings Queue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>High & Critical Findings</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
            {metrics.highPriorityCount || 0}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              of {metrics.totalFindingsCount || 0} total
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-rose-600 font-semibold">Immediate Audit Needed</span>
            <Link
              href="/findings?severity=CRITICAL"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
            >
              <span>View queue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Immediate AP Clawback Opportunities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-subtle hover:shadow-card transition-all group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Unapplied Credits & Duplicates</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 group-hover:scale-105 transition-transform">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 tracking-tight font-mono tabular-nums">
            {formatINR((metrics.unappliedCreditsTotal || 0) + (metrics.duplicatePaymentsTotal || 0))}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-blue-700 font-semibold">Direct Cash Offset</span>
            <Link
              href="/findings?category=UNAPPLIED_CREDIT"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
            >
              <span>Apply now</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Financial Leakage Recovery Pipeline & Governance Funnel */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Financial Leakage Recovery Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Clear mathematical separation between potential exposure, disputed balances, confirmed audit savings, and collected cash.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-semibold self-start sm:self-auto border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <span>Maker-Checker Governance</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 mb-1">
              1. Gross Identified Exposure
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {formatINR(metrics.totalGrossExposure || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Total variances detected across documents
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="text-xs font-semibold text-amber-800 mb-1">
              2. Net Unique Disputed
            </div>
            <div className="text-xl font-bold text-amber-900 font-mono tabular-nums">
              {formatINR(metrics.netUniqueExposure || 0)}
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              Zero double-counting deduplicated pool
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <div className="text-xs font-semibold text-blue-800 mb-1">
              3. Confirmed by Auditor
            </div>
            <div className="text-xl font-bold text-blue-900 font-mono tabular-nums">
              {formatINR(metrics.confirmedSavings || 0)}
            </div>
            <div className="text-[11px] text-blue-700 mt-1">
              Corroborated with signed documentary evidence
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="text-xs font-semibold text-emerald-800 mb-1">
              4. Actually Recovered Cash
            </div>
            <div className="text-xl font-bold text-emerald-900 font-mono tabular-nums">
              {formatINR(metrics.actualRecoveries || 0)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Direct supplier refunds or AP ledger debits
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Operational Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left Column (2/3 width): Supplier Scorecard & Discrepancies */}
        <div className="lg:col-span-2 space-y-7">
          {/* Recent Discrepancies Requiring Review */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-200/90 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  High-Priority Discrepancy Findings
                </h3>
                <p className="text-xs text-slate-500">
                  Corroborated by deterministic line-item comparisons
                </p>
              </div>
              <Link
                href="/findings"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
              >
                <span>View All Findings</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.recentFindings?.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700">No open discrepancies detected</p>
                  <p className="text-slate-400 mt-1">All processed records are currently in balance.</p>
                </div>
              ) : (
                data?.recentFindings?.map((f: any) => (
                  <Link
                    key={f.id}
                    href={`/findings/${f.id}`}
                    className="p-4 sm:p-5 block hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
                            {f.findingCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : f.severity === "HIGH"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {f.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {f.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                          {formatINR(f.grossDiscrepancy)}
                        </div>
                        <div className="text-[10px] text-slate-400">Potential Leakage</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
                      <span>Vendor: {f.supplier?.legalName || "Multiple Vendors"}</span>
                      <span className="flex items-center gap-1">
                        <span>Risk Score:</span>
                        <strong className="text-slate-700">{f.compositeRiskScore}/100</strong>
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Supplier Financial Exposure Scorecard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-200/90 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Supplier Financial Exposure Scorecard
                </h3>
                <p className="text-xs text-slate-500">
                  Ranked by cumulative leakage and recovery opportunities
                </p>
              </div>
              <Link
                href="/suppliers"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
              >
                <span>Vendor Intelligence</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold font-mono text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Supplier Entity</th>
                    <th className="py-3 px-4">Vendor Code</th>
                    <th className="py-3 px-4">Open Discrepancies</th>
                    <th className="py-3 px-6 text-right">Total Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {supplierExposure.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No vendor records registered yet.
                      </td>
                    </tr>
                  ) : (
                    supplierExposure.map((sup: any) => (
                      <tr
                        key={sup.vendorCode}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {sup.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {sup.vendorCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {sup.findingsCount} findings
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-900 font-mono tabular-nums">
                          {formatINR(sup.exposure)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Backlog Aging & Category Breakdown */}
        <div className="space-y-7">
          {/* Investigation Backlog Aging */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Investigation Backlog Aging
              </h3>
              <p className="text-xs text-slate-500">Aging profile of unresolved findings</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <span className="text-xl font-extrabold text-emerald-800 block font-mono">
                  {metrics.agingUnder7Days || 0}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">&lt; 7 Days</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                <span className="text-xl font-extrabold text-amber-800 block font-mono">
                  {metrics.aging7To30Days || 0}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">7 - 30 Days</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80">
                <span className="text-xl font-extrabold text-rose-800 block font-mono">
                  {metrics.agingOver30Days || 0}
                </span>
                <span className="text-[10px] text-rose-700 font-semibold">&gt; 30 Days</span>
              </div>
            </div>
          </div>

          {/* Leakage by Discrepancy Category */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Leakage by Discrepancy Category
              </h3>
              <p className="text-xs text-slate-500">Categorical breakdown of open exposure</p>
            </div>

            <div className="space-y-2.5 text-xs">
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div className="text-slate-400 text-center py-6 text-xs">
                  No categorical findings recorded.
                </div>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, info]: any) => (
                  <div
                    key={cat}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-800">
                        {cat.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        {formatINR(info.exposure)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {info.count} active finding(s)
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Audit Action Palette */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Audit Operations
            </h3>
            <div className="space-y-2">
              <Link
                href="/reconciliation"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                <span>Run 3-Way Reconciliation Workbench</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/documents"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                <span>Upload New Vendor Document Batch</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/reports"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                <span>Generate Board-Ready Audit Report</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
