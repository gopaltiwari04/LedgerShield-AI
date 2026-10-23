"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
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
        setConfirmedAmount(String(json.finding.confirmedAmount || json.finding.potentialRecoverable));
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
    const query = customQuery || aiQuery || "Provide a comprehensive investigation assessment.";
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
      <div className="flex items-center justify-center h-96 text-slate-500 text-xs">
        Loading investigation file...
      </div>
    );
  }

  const f = data?.finding;
  if (!f) {
    return <div className="text-slate-500 text-xs">Finding not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/findings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Findings Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Disposition:</span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
              f.status === "CONFIRMED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : f.status === "RECOVERED"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : f.status === "DISMISSED"
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {f.status}
          </span>
        </div>
      </div>

      {/* Main Finding Overview Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {f.findingCode}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase">
                {f.category.replace(/_/g, " ")}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  f.severity === "CRITICAL"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : f.severity === "HIGH"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {f.severity} SEVERITY
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{f.title}</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              {f.description}
            </p>
          </div>

          <div className="text-right shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[200px]">
            <span className="text-[11px] text-slate-500 font-medium block">Calculated Discrepancy</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(f.grossDiscrepancy)}
            </span>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              Recoverable: {formatINR(f.potentialRecoverable)}
            </div>
          </div>
        </div>

        {/* Financial Exposure Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Paid to Date</span>
            <span className="font-semibold text-slate-900">{formatINR(f.amountPaid)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Unpaid Disputed Balance</span>
            <span className="font-semibold text-amber-700">{formatINR(f.unpaidDisputedAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Confirmed Savings</span>
            <span className="font-semibold text-blue-700">{formatINR(f.confirmedAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Actual Recovered Cash</span>
            <span className="font-semibold text-purple-700">{formatINR(f.recoveredAmount)}</span>
          </div>
        </div>

        {/* Exact Variance Formula */}
        <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-xs space-y-1">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-blue-600" />
            <span>Deterministic Variance Calculation:</span>
          </div>
          <div className="font-mono text-slate-800 text-[11px] bg-white p-2 rounded border border-blue-100">
            {f.varianceCalculation}
          </div>
          <div className="text-[11px] text-slate-600 pt-1">
            <strong>Recommended Auditor Action:</strong> {f.recommendedAction}
          </div>
        </div>
      </div>

      {/* Two Columns: Evidence & Risk Score / AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Side-by-side Evidence & Related Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Side-by-Side Evidence Comparison */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Side-by-Side Document Evidence</h2>
                <p className="text-xs text-slate-500">Cross-referencing original PO, Invoice, and Warehouse GRN</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Extraction Certainty: {f.anomalyConfidence}%
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expected Benchmark Document */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      Approved Benchmark (PO / GRN)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                      AUTHORIZED
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mb-1">{f.expectedValue}</div>
                  <div className="text-[11px] text-slate-500">
                    Source: {f.poNumber ? `PO #${f.poNumber}` : "Standard Contract / Master"}
                  </div>
                </div>

                {/* Observed Billing Document */}
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Observed Billing / Settlement
                    </span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono">
                      DEVIATION
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mb-1">{f.observedValue}</div>
                  <div className="text-[11px] text-slate-500">
                    Source: {f.invoiceNumber ? `Invoice #${f.invoiceNumber}` : "Bank Settlement / Statements"}
                  </div>
                </div>
              </div>

              {/* Documentary Evidence Records */}
              {f.evidences && f.evidences.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="text-xs font-bold text-slate-700 mb-2">Linked Source Document Records:</div>
                  <div className="space-y-2">
                    {f.evidences.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800">
                              {ev.documentType.replace(/_/g, " ")} #{ev.documentNumber}
                            </span>
                            {ev.sourceField && (
                              <span className="text-slate-400 ml-2">
                                Field: <code className="text-slate-700">{ev.sourceField}</code>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-900">{ev.sourceValue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Investigation Assistant Widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">AI Grounded Investigation Assistant</h3>
                  <p className="text-[11px] text-slate-300">Retrieves real documentary evidence; never hallucinates numbers</p>
                </div>
              </div>
              <button
                onClick={() => handleAskAI()}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5"
              >
                {aiLoading ? "Analyzing..." : "Generate AI Brief"}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => handleAskAI("Explain why this invoice was flagged.")}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200"
                >
                  Why was this flagged?
                </button>
                <button
                  onClick={() => handleAskAI("Draft neutral clarification email to supplier.")}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200"
                >
                  Draft supplier clarification email
                </button>
                <button
                  onClick={() => handleAskAI("What documents are missing to verify this?")}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200"
                >
                  What documents are missing?
                </button>
              </div>

              {/* AI Output Card */}
              {aiResult ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                    {aiResult.answer}
                  </div>

                  {/* Supplier Draft Email Box */}
                  {aiResult.supplierDraftEmail && (
                    <div className="p-4 rounded-lg bg-white border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          Generated Neutral Clarification Request:
                        </span>
                        <button
                          onClick={handleCopyDraft}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedEmail ? "Copied to clipboard!" : "Copy Draft"}
                        </button>
                      </div>
                      <pre className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 font-mono whitespace-pre-wrap">
                        {aiResult.supplierDraftEmail}
                      </pre>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 italic border-t border-slate-200 pt-2">
                    {aiResult.disclaimer}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Click &ldquo;Generate AI Brief&rdquo; or select a prompt chip above to synthesize documentary facts and generate non-accusatory correspondence.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Explainable Risk Score & Auditor Disposition Actions */}
        <div className="space-y-6">
          {/* Explainable Risk Engine Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Explainable Risk Score
                </h3>
                <p className="text-[11px] text-slate-400">Separation of impact, confidence, and suspicion</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-slate-900">{f.compositeRiskScore}</span>
                <span className="text-[11px] text-slate-400"> / 100</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">1. Financial Exposure Impact</span>
                  <span className="font-bold text-slate-800">{f.financialImpactScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${f.financialImpactScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">2. Anomaly Mathematical Certainty</span>
                  <span className="font-bold text-slate-800">{f.anomalyConfidence} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full" style={{ width: `${f.anomalyConfidence}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium">3. Fraud / Collusion Suspicion</span>
                  <span className="font-bold text-slate-800">{f.fraudSuspicionScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full" style={{ width: `${f.fraudSuspicionScore}%` }} />
                </div>
              </div>
            </div>

            {/* Risk Signals */}
            {f.riskSignals && f.riskSignals.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Corroborating Signals:</span>
                {f.riskSignals.map((rs: any) => (
                  <div key={rs.id} className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <strong className="text-slate-800">{rs.signalType.replace(/_/g, " ")}:</strong> {rs.description}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maker-Checker Disposition & Action Box */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Auditor Disposition & Workflow
            </h3>

            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Finding disposition updated and logged to tamper-evident audit history.</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Confirmed Recoverable (₹)</label>
                <input
                  type="number"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Actually Recovered Cash (₹)</label>
                <input
                  type="number"
                  value={recoveredAmount}
                  onChange={(e) => setRecoveredAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Reviewer Note / Justification</label>
                <textarea
                  rows={2}
                  placeholder="Record verification notes, debit note references, or dismissal justification..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleUpdateStatus("CONFIRMED")}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                >
                  Confirm Leakage
                </button>
                <button
                  onClick={() => handleUpdateStatus("RECOVERED")}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm"
                >
                  Log Recovery
                </button>
                <button
                  onClick={() => handleUpdateStatus("IN_REVIEW")}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200"
                >
                  Hold In Review
                </button>
                <button
                  onClick={() => handleUpdateStatus("DISMISSED")}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs border border-slate-200"
                >
                  Dismiss Error
                </button>
              </div>
            </div>

            {/* Audit Log Trail */}
            {f.comments && f.comments.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Investigation Trail:</span>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {f.comments.map((c: any) => (
                    <div key={c.id} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span className="font-semibold text-slate-700">{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{c.commentText}</p>
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
