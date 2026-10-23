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
      description: "High-level overview of net exposure, confirmed savings, and recovery pipeline for the CFO and Board.",
      type: "LEAKAGE_SUMMARY",
      icon: TrendingDown,
    },
    {
      id: "SUPPLIER_RECON",
      title: "Supplier Statement Reconciliation Report",
      description: "Vendor-by-vendor reconciliation statement highlighting outstanding balances, open credits, and billing variances.",
      type: "SUPPLIER_RECON",
      icon: Building,
    },
    {
      id: "DUPLICATES",
      title: "Duplicate Invoices & Payments Audit Trail",
      description: "Detailed register of multiple settlement UTRs on identical invoice liabilities for clawback.",
      type: "DUPLICATES",
      icon: RotateCcw,
    },
    {
      id: "CREDIT_NOTES",
      title: "Unapplied Supplier Credits Ledger",
      description: "Listing of active credit notes issued by suppliers that have not been credited to accounts payable.",
      type: "CREDIT_NOTES",
      icon: Receipt,
    },
    {
      id: "INTEGRITY_AUDIT",
      title: "Procurement Integrity & Collusion Audit",
      description: "Threshold avoidance (split invoices), shared vendor banking accounts, and single-approver exception logs.",
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit & Financial Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate formal audit trails, recovery registers, and executive summaries distinguishing facts, estimates, and recovered cash
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
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-400 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">{r.title}</h2>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{r.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Live Report Preview & Export Controls */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                Formal Audit Document
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">{current.title}</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Target Entity: {reportData?.organization?.name || "Your Organization"} • Period: FY 2024-25
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/reports/export?type=${current.type}&format=csv`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Download CSV / Excel</span>
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Report Preview Body */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-6 text-xs text-slate-800">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <div className="font-bold text-sm text-slate-900">LEDGERSHIELD AUDIT TRAIL</div>
                <div className="text-[11px] text-slate-500">Confidential Internal Controls Document</div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
                <div>Scope: {findings.length} Verified Records</div>
              </div>
            </div>

            {/* Metric Summary Matrix */}
            <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">NET DISPUTED EXPOSURE</span>
                <span className="text-base font-bold text-amber-900">
                  {formatINR(reportData?.netUniqueExposure || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Deduplicated across findings</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">CONFIRMED SAVINGS</span>
                <span className="text-base font-bold text-blue-900">
                  {formatINR(reportData?.confirmedSavings || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Verified by Auditor</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">ACTUAL CASH RECOVERED</span>
                <span className="text-base font-bold text-emerald-900">
                  {formatINR(reportData?.actualRecovered || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Completed recoveries</span>
              </div>
            </div>

            {/* Live Database Findings in Report */}
            <div>
              <div className="font-bold text-xs text-slate-900 mb-2">Verified Findings & Evidences:</div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Supplier / Reference</th>
                      <th className="p-2.5">Calculation Formula</th>
                      <th className="p-2.5 text-right">Exposure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Loading report rows...
                        </td>
                      </tr>
                    ) : findings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No discrepancy findings on record for this report scope.
                        </td>
                      </tr>
                    ) : (
                      findings.map((f: any) => (
                        <tr key={f.id}>
                          <td className="p-2.5 font-mono font-bold text-blue-600">{f.findingCode}</td>
                          <td className="p-2.5">{f.category}</td>
                          <td className="p-2.5 text-slate-600">
                            {f.supplier?.legalName || "Multiple"}
                            {f.invoiceNumber ? ` • ${f.invoiceNumber}` : ""}
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-slate-700 max-w-xs truncate">
                            {f.varianceCalculation || f.title}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
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
            <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
              <div>
                Organization: <span className="font-mono text-slate-700">{reportData?.organization?.name}</span>
              </div>
              <div className="italic">
                Distinguishes documentary facts from investigative hypotheses.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
