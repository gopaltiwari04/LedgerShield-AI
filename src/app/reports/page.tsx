"use client";

import { useEffect, useState } from "react";
import {
  FileCheck,
  FileSpreadsheet,
  Printer,
  TrendingDown,
  Building,
  RotateCcw,
  Receipt,
  ShieldAlert,
  ArrowRight,
  Download,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("LEAKAGE_SUMMARY");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reports = [
    {
      id: "LEAKAGE_SUMMARY",
      title: "Executive Financial Leakage Summary",
      description:
        "High-level overview of net exposure, confirmed savings, and recovery pipeline for the CFO and Board.",
      type: "LEAKAGE_SUMMARY",
      icon: TrendingDown,
    },
    {
      id: "SUPPLIER_RECON",
      title: "Supplier Statement Reconciliation Report",
      description:
        "Vendor-by-vendor reconciliation statement highlighting outstanding balances, open credits, and billing variances.",
      type: "SUPPLIER_RECON",
      icon: Building2,
    },
    {
      id: "DUPLICATES",
      title: "Duplicate Invoices & Payments Audit Trail",
      description:
        "Detailed register of multiple settlement UTRs on identical invoice liabilities for clawback.",
      type: "DUPLICATES",
      icon: RotateCcw,
    },
    {
      id: "CREDIT_NOTES",
      title: "Unapplied Supplier Credits Ledger",
      description:
        "Listing of active credit notes issued by suppliers that have not been credited to accounts payable.",
      type: "CREDIT_NOTES",
      icon: Receipt,
    },
    {
      id: "INTEGRITY_AUDIT",
      title: "Procurement Integrity & Collusion Audit",
      description:
        "Threshold avoidance (split invoices), shared vendor banking accounts, and single-approver exception logs.",
      type: "INTEGRITY_AUDIT",
      icon: ShieldAlert,
    },
  ];

  const current = reports.find((r) => r.id === selectedReport) || reports[0];

  useEffect(() => {
    fetchReportData(selectedReport);
  }, [selectedReport]);

  const fetchReportData = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/export?type=${type}&format=json`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const findings = reportData?.findings || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Board Audit & Financial Reports
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate formal audit trails, clawback registers, and executive summaries distinguishing verified facts from estimates
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Report Selectors */}
        <div className="space-y-3">
          {reports.map((r) => {
            const Icon = r.icon;
            const isSelected = r.id === selectedReport;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/80 border-blue-400 shadow-brand shadow-blue-500/10 font-bold"
                    : "bg-white border-slate-200/90 hover:border-slate-300 shadow-subtle"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-slate-900">{r.title}</h2>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                    {r.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Live Report Preview & Export Controls */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                Formal Audit Document
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1.5 tracking-tight">
                {current.title}
              </h2>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                Target Entity: {reportData?.organization?.name || "Your Organization"} • Period: FY 2024-25
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`/api/reports/export?type=${current.type}&format=csv`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-brand transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export CSV</span>
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-subtle transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Report Preview Body */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 space-y-6 text-xs text-slate-800">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <div className="font-black text-sm text-slate-900 tracking-tight">
                  LEDGERSHIELD AUDIT TRAIL
                </div>
                <div className="text-[11px] text-slate-500">
                  Confidential Internal Controls & Reconciliation Dossier
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono">
                <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
                <div>Scope: {findings.length} Verified Records</div>
              </div>
            </div>

            {/* Metric Summary Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">
                  NET DISPUTED EXPOSURE
                </span>
                <span className="text-lg font-black text-amber-900 font-mono tabular-nums mt-0.5 block">
                  {formatINR(reportData?.netUniqueExposure || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  Zero double-counting pool
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">
                  CONFIRMED SAVINGS
                </span>
                <span className="text-lg font-black text-blue-900 font-mono tabular-nums mt-0.5 block">
                  {formatINR(reportData?.confirmedSavings || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  Verified with signed evidence
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">
                  ACTUAL CASH RECOVERED
                </span>
                <span className="text-lg font-black text-emerald-900 font-mono tabular-nums mt-0.5 block">
                  {formatINR(reportData?.actualRecovered || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  Realized in AP ledger
                </span>
              </div>
            </div>

            {/* Live Database Findings in Report */}
            <div>
              <div className="font-extrabold text-xs text-slate-900 mb-2.5">
                Verified Findings & Documentary Evidences:
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-subtle">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100/80 text-slate-700 font-mono font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Supplier / Ref</th>
                      <th className="p-3">Calculation Formula</th>
                      <th className="p-3 text-right">Exposure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          Loading report records...
                        </td>
                      </tr>
                    ) : findings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No discrepancy findings on record for this report scope.
                        </td>
                      </tr>
                    ) : (
                      findings.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-bold text-blue-600">
                            {f.findingCode}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{f.category}</td>
                          <td className="p-3 text-slate-600">
                            {f.supplier?.legalName || "Multiple"}
                            {f.invoiceNumber ? ` • ${f.invoiceNumber}` : ""}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-700 max-w-xs truncate">
                            {f.varianceCalculation || f.title}
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900 font-mono tabular-nums">
                            {formatINR(f.grossDiscrepancy)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditor Certification Footnote */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-slate-500 font-mono">
              <div>
                Tenant: <span className="text-slate-800 font-bold">{reportData?.organization?.name}</span>
              </div>
              <div className="italic">
                Deterministic calculations distinguishing verified facts from estimates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
