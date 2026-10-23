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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-50 text-red-700 border-red-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "RECOVERED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DISMISSED":
        return "bg-slate-100 text-slate-500 border-slate-200 line-through";
      case "IN_REVIEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Financial Discrepancy Findings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic variances, quantity shortages, duplicate payments, and procurement anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export?type=FINDINGS_QUEUE&format=csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code (FL-2024-001), invoice #, PO #, or item description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
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
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="RECOVERED">Recovered</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Loading investigation findings...
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No discrepancy findings match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Finding ID & Code</th>
                  <th className="py-3 px-4">Title & Context</th>
                  <th className="py-3 px-4">Supplier Entity</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-6 text-right">Gross Exposure</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-blue-600">
                      <Link href={`/findings/${f.id}`} className="hover:underline">
                        {f.findingCode}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{f.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {f.invoiceNumber ? `Inv: ${f.invoiceNumber}` : ""}{" "}
                        {f.poNumber ? `• PO: ${f.poNumber}` : ""}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[180px]">
                        {f.supplier?.legalName || "Multiple / Cross-Entity"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {f.supplier?.vendorCode || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(
                          f.severity
                        )}`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                          f.status
                        )}`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              f.compositeRiskScore >= 75
                                ? "bg-red-500"
                                : f.compositeRiskScore >= 50
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${f.compositeRiskScore}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[11px] text-slate-800">
                          {f.compositeRiskScore}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                      {formatINR(f.grossDiscrepancy)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/findings/${f.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Investigate <ChevronRight className="h-3 w-3" />
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
