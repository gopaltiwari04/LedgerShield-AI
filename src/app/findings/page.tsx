"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ChevronRight,
  ShieldAlert,
  CheckCircle,
  Clock,
  Building,
  RotateCcw,
  Receipt,
  FileText,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function FindingsPage() {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchFindings();
  }, [selectedCategory, selectedSeverity, selectedStatus, search]);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (selectedSeverity !== "ALL") params.set("severity", selectedSeverity);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (search) params.set("search", search);

      const res = await fetch(`/api/findings?${params.toString()}`);
      const data = await res.json();
      setFindings(data.findings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedSeverity("ALL");
    setSelectedStatus("ALL");
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/80 font-bold";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200/80 font-bold";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200/80 font-semibold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 font-medium";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "RECOVERED":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "DISMISSED":
        return "bg-slate-100 text-slate-500 border-slate-200 line-through opacity-75";
      case "IN_REVIEW":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
  };

  const hasActiveFilters =
    search !== "" ||
    selectedCategory !== "ALL" ||
    selectedSeverity !== "ALL" ||
    selectedStatus !== "ALL";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Discrepancy Investigation Queue
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {findings.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Deterministic variances, unapplied credits, duplicate payments, and procurement collusion signals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <a
            href="/api/reports/export?type=FINDINGS_QUEUE&format=csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-subtle transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-subtle space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code (FL-2024-001), invoice #, PO #, or item description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="PRICE_VARIANCE">Price Variance</option>
              <option value="QUANTITY_SHORTAGE">Quantity Shortage</option>
              <option value="DUPLICATE_PAYMENT">Duplicate Payment</option>
              <option value="UNAPPLIED_CREDIT">Unapplied Credit</option>
              <option value="SPLIT_INVOICE">Split Invoice</option>
              <option value="COLLUSION_SIGNAL">Collusion / Shared Entity</option>
              <option value="DUPLICATE_DOCUMENT">Duplicate Document</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Queue</option>
              <option value="IN_REVIEW">Under Review</option>
              <option value="CONFIRMED">Auditor Confirmed</option>
              <option value="RECOVERED">Recovered in AP</option>
              <option value="DISMISSED">Dismissed / Allowed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-blue-600 mb-3" />
            <p className="font-medium text-slate-600">Scanning forensic discrepancy database...</p>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-3">
            <CheckCircle className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">No findings match the current criteria</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Try adjusting your category, severity or search query to view other discrepancy records.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-mono font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Finding Code</th>
                  <th className="py-3.5 px-4">Title & Context</th>
                  <th className="py-3.5 px-4">Supplier Entity</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-6 text-right">Gross Discrepancy</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {findings.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-4 px-6 font-mono font-bold text-blue-600">
                      <Link
                        href={`/findings/${f.id}`}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200/70 inline-block transition-colors"
                      >
                        {f.findingCode}
                      </Link>
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {f.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                        {f.invoiceNumber ? `Inv: ${f.invoiceNumber}` : ""}
                        {f.invoiceNumber && f.poNumber ? " • " : ""}
                        {f.poNumber ? `PO: ${f.poNumber}` : ""}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {f.supplier?.legalName || "Multiple / Cross-Entity"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {f.supplier?.vendorCode || "N/A"}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${getSeverityBadge(
                          f.severity
                        )}`}
                      >
                        {f.severity}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                          f.status
                        )}`}
                      >
                        {f.status}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              f.compositeRiskScore >= 75
                                ? "bg-rose-500"
                                : f.compositeRiskScore >= 50
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${f.compositeRiskScore}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-800">
                          {f.compositeRiskScore}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right font-extrabold text-slate-900 font-mono tabular-nums text-xs">
                      {formatINR(f.grossDiscrepancy)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/findings/${f.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <span>Investigate</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
