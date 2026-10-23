"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  FileText,
  Building,
  Calendar,
  Send,
  MessageSquare,
  Bot,
  Copy,
  Check,
  Scale,
  Clock,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reviewer disposition state
  const [status, setStatus] = useState("OPEN");
  const [confirmedAmount, setConfirmedAmount] = useState("");
  const [recoveredAmount, setRecoveredAmount] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // AI Assistant state
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    fetchFindingDetail();
  }, [params.id]);

  const fetchFindingDetail = async () => {
    try {
      const res = await fetch(`/api/findings/${params.id}`);
      const json = await res.json();
      setData(json);
      if (json.finding) {
        setStatus(json.finding.status);
        setConfirmedAmount(
          String(json.finding.confirmedAmount || json.finding.potentialRecoverable)
        );
        setRecoveredAmount(String(json.finding.recoveredAmount || 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/findings/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          comment: commentText || `Finding disposition changed to ${newStatus}.`,
          confirmedAmount: Number(confirmedAmount),
          recoveredAmount: Number(recoveredAmount),
          authorName: "Priya Nair (Lead Auditor)",
        }),
      });
      const updated = await res.json();
      if (updated.success) {
        setActionSuccess(true);
        setStatus(newStatus);
        setCommentText("");
        setTimeout(() => setActionSuccess(false), 4000);
        fetchFindingDetail();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAI = async (customQuery?: string) => {
    setAiLoading(true);
    const query =
      customQuery || aiQuery || "Provide a comprehensive investigation assessment.";
    try {
      const res = await fetch(`/api/findings/${params.id}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();
      setAiResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (aiResult?.supplierDraftEmail) {
      navigator.clipboard.writeText(aiResult.supplierDraftEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const f = data?.finding;
  if (!f) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-subtle">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Finding Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The discrepancy finding you requested does not exist or belongs to another tenant.
        </p>
        <Link
          href="/findings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Findings Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/findings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Findings Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Disposition:</span>
          <span
            className={`px-3 py-0.5 rounded-full text-xs font-bold font-mono border ${
              f.status === "CONFIRMED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                : f.status === "RECOVERED"
                ? "bg-purple-50 text-purple-700 border-purple-200/80"
                : f.status === "DISMISSED"
                ? "bg-slate-100 text-slate-500 border-slate-200 line-through"
                : "bg-amber-50 text-amber-700 border-amber-200/80"
            }`}
          >
            {f.status}
          </span>
        </div>
      </div>

      {/* Primary Dossier Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80">
                {f.findingCode}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  f.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : f.severity === "HIGH"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
              >
                {f.severity} SEVERITY
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                Category: {f.category.replace(/_/g, " ")}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {f.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              {f.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {f.supplier?.legalName || "Multiple / Cross-Entity"}
              </span>
              <span>Vendor Code: {f.supplier?.vendorCode || "N/A"}</span>
              <span>Detected: {new Date(f.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <div className="text-left md:text-right bg-slate-50 p-4 rounded-xl border border-slate-200/80 md:min-w-[200px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">
              Gross Discrepancy
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
              {formatINR(f.grossDiscrepancy)}
            </span>
            <span className="text-[11px] text-rose-600 font-semibold block mt-1">
              Potential Leakage at Risk
            </span>
          </div>
        </div>

        {/* Financial Exposure Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-mono">Paid to Date</span>
            <span className="font-extrabold text-slate-900 font-mono tabular-nums text-sm">
              {formatINR(f.amountPaid)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-mono">Unpaid Disputed Balance</span>
            <span className="font-extrabold text-amber-700 font-mono tabular-nums text-sm">
              {formatINR(f.unpaidDisputedAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-mono">Confirmed Savings</span>
            <span className="font-extrabold text-blue-700 font-mono tabular-nums text-sm">
              {formatINR(f.confirmedAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-mono">Actual Recovered Cash</span>
            <span className="font-extrabold text-emerald-700 font-mono tabular-nums text-sm">
              {formatINR(f.recoveredAmount)}
            </span>
          </div>
        </div>

        {/* Exact Variance Formula */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-2">
          <div className="font-bold text-blue-950 flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-blue-600" />
            <span>Deterministic Variance Calculation:</span>
          </div>
          <div className="font-mono text-slate-900 text-xs bg-white p-2.5 rounded-lg border border-blue-200/80 leading-relaxed">
            {f.varianceCalculation}
          </div>
          <div className="text-xs text-slate-700 pt-1">
            <strong className="text-blue-900">Recommended Auditor Action:</strong> {f.recommendedAction}
          </div>
        </div>
      </div>

      {/* Two Columns: Evidence & Risk Score / AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Side-by-side Evidence & Related Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Side-by-Side Evidence Comparison */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-200/90 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Side-by-Side Document Evidence
                </h2>
                <p className="text-xs text-slate-500">
                  Cross-referencing approved PO benchmark with observed invoice & GRN
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                Certainty: {f.anomalyConfidence}%
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expected Benchmark Document */}
                <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Approved Benchmark (PO / GRN)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded font-mono font-bold">
                      AUTHORIZED
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mb-1">
                    {f.expectedValue}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Source: {f.poNumber ? `PO #${f.poNumber}` : "Standard Contract / Master"}
                  </div>
                </div>

                {/* Observed Billing Document */}
                <div className="p-4 rounded-xl border border-rose-200/90 bg-rose-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Observed Billing / Settlement
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.2 rounded font-mono font-bold">
                      DEVIATION
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mb-1">
                    {f.observedValue}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Source: {f.invoiceNumber ? `Invoice #${f.invoiceNumber}` : "Bank Settlement / Statements"}
                  </div>
                </div>
              </div>

              {/* Documentary Evidence Records */}
              {f.evidences && f.evidences.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="text-xs font-bold text-slate-800 mb-2.5">
                    Corroborating Document Records:
                  </div>
                  <div className="space-y-2">
                    {f.evidences.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">
                              {ev.documentType.replace(/_/g, " ")} #{ev.documentNumber}
                            </span>
                            {ev.sourceField && (
                              <span className="text-slate-400 ml-2 font-mono text-[11px]">
                                Field: <code className="text-slate-700 bg-slate-200/60 px-1 py-0.2 rounded">{ev.sourceField}</code>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-right">
                          {ev.sourceValue}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Grounded Investigation Assistant Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
            <div className="px-6 py-4.5 bg-gradient-to-r from-[#0A101D] via-[#0F1E36] to-[#0A101D] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">
                    Google Gemini Forensic Co-Pilot
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Grounded strictly on uploaded documents; zero mathematical hallucinations
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAskAI()}
                disabled={aiLoading}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-brand shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate AI Brief</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => handleAskAI("Explain why this invoice was flagged.")}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Why was this flagged?
                </button>
                <button
                  onClick={() => handleAskAI("Draft neutral clarification email to supplier.")}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Draft supplier clarification email
                </button>
                <button
                  onClick={() => handleAskAI("What documents are missing to verify this?")}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  What documents are missing?
                </button>
              </div>

              {/* AI Output Card */}
              {aiResult ? (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                    {aiResult.answer}
                  </div>

                  {/* Supplier Draft Email Box */}
                  {aiResult.supplierDraftEmail && (
                    <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          Generated Neutral Clarification Request:
                        </span>
                        <button
                          onClick={handleCopyDraft}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                        >
                          {copiedEmail ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Draft</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[11px] text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                        {aiResult.supplierDraftEmail}
                      </pre>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 italic border-t border-slate-200 pt-2 font-mono">
                    {aiResult.disclaimer}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs space-y-1">
                  <Sparkles className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  <p className="font-semibold text-slate-600">AI Investigation Assistant Ready</p>
                  <p className="text-slate-400">
                    Click &ldquo;Generate AI Brief&rdquo; or select a prompt chip to synthesize evidence and draft non-accusatory correspondence.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Explainable Risk Score & Auditor Disposition Actions */}
        <div className="space-y-6">
          {/* Explainable Risk Engine Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Explainable Risk Score
                </h3>
                <p className="text-[11px] text-slate-400">Impact, certainty, and collusion weightings</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {f.compositeRiskScore}
                </span>
                <span className="text-[11px] text-slate-400 font-mono"> / 100</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-600 font-medium">1. Financial Exposure Impact</span>
                  <span className="font-bold text-slate-900">{f.financialImpactScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${f.financialImpactScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-600 font-medium">2. Anomaly Mathematical Certainty</span>
                  <span className="font-bold text-slate-900">{f.anomalyConfidence} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${f.anomalyConfidence}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-600 font-medium">3. Fraud / Collusion Suspicion</span>
                  <span className="font-bold text-slate-900">{f.fraudSuspicionScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full"
                    style={{ width: `${f.fraudSuspicionScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Risk Signals */}
            {f.riskSignals && f.riskSignals.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block font-mono uppercase">
                  Corroborating Signals:
                </span>
                {f.riskSignals.map((rs: any) => (
                  <div
                    key={rs.id}
                    className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed"
                  >
                    <strong className="text-slate-900">{rs.signalType.replace(/_/g, " ")}:</strong>{" "}
                    {rs.description}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maker-Checker Disposition & Action Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Auditor Disposition & Workflow
            </h3>

            {actionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Finding disposition updated and logged to tamper-evident audit history.</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Confirmed Recoverable (₹)
                </label>
                <input
                  type="number"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Actually Recovered Cash (₹)
                </label>
                <input
                  type="number"
                  value={recoveredAmount}
                  onChange={(e) => setRecoveredAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reviewer Note / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="Record verification notes, debit note references, or dismissal justification..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleUpdateStatus("CONFIRMED")}
                  disabled={submitting}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Confirm Leakage
                </button>
                <button
                  onClick={() => handleUpdateStatus("RECOVERED")}
                  disabled={submitting}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Log Recovery
                </button>
                <button
                  onClick={() => handleUpdateStatus("IN_REVIEW")}
                  disabled={submitting}
                  className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer"
                >
                  Hold In Review
                </button>
                <button
                  onClick={() => handleUpdateStatus("DISMISSED")}
                  disabled={submitting}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                >
                  Dismiss Error
                </button>
              </div>
            </div>

            {/* Audit Log Trail */}
            {f.comments && f.comments.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block font-mono uppercase">
                  Investigation Trail:
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto dark-scrollbar">
                  {f.comments.map((c: any) => (
                    <div
                      key={c.id}
                      className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                    >
                      <div className="flex justify-between text-slate-400 text-[10px] font-mono">
                        <span className="font-bold text-slate-700">{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{c.commentText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
