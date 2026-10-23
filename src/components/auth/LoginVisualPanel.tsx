"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  FileCheck2,
  ShieldAlert,
  ReceiptText,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface FeatureSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: any;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  highlights: string[];
  metrics: { label: string; value: string }[];
}

const FEATURES: FeatureSlide[] = [
  {
    id: "3way-reconciliation",
    tag: "CORE RECONCILIATION ENGINE",
    title: "Autonomous 3-Way Reconciliation",
    subtitle: "Deterministic matching across POs, Goods Receipts & Invoices",
    description:
      "Identifies unit price variances, quantity discrepancies, missing goods receipts, and unapplied vendor credit notes before accounts payable dispatches payment.",
    image: "/images/features/reconciliation-3way.jpg",
    icon: FileCheck2,
    accentColor: "from-blue-500 to-emerald-500",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30 text-blue-400",
    highlights: [
      "PO vs GRN vs Invoice Line-Item Matching",
      "Unit Price Creep & Tolerance Detection",
      "Automated Credit Note Application",
    ],
    metrics: [
      { label: "Match Precision", value: "99.8%" },
      { label: "Leakage Prevented", value: "₹4.2 Cr" },
      { label: "Audit Latency", value: "< 2.5s" },
    ],
  },
  {
    id: "procurement-fraud",
    tag: "PROCUREMENT FRAUD & INTEGRITY",
    title: "Forensic Leakage & Collusion Shield",
    subtitle: "Real-time pattern analysis for internal & supplier irregularities",
    description:
      "Detects split purchase orders designed to bypass executive approval limits, near-duplicate invoice submissions, phantom vendors, and last-minute supplier bank account alterations.",
    image: "/images/features/fraud-detection.jpg",
    icon: ShieldAlert,
    accentColor: "from-amber-500 to-rose-500",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30 text-amber-400",
    highlights: [
      "Duplicate Invoice Hashing & Number Variations",
      "Split PO Threshold Evasion Detection",
      "Vendor Relationship Graph & Shell Company Signals",
    ],
    metrics: [
      { label: "Forensic Rules", value: "10 Rules" },
      { label: "Risk Scoring", value: "0 - 100 Index" },
      { label: "Detection Speed", value: "Instant" },
    ],
  },
  {
    id: "tax-compliance",
    tag: "INDIAN STATUTORY COMPLIANCE",
    title: "GST & E-Invoicing Tax Audit",
    subtitle: "Automated GSTIN, IRN verification & 180-day ITC protection",
    description:
      "Cross-references supplier GSTIN active status, validates e-Invoice IRN digital signatures, audits HSN/SAC classifications, and tracks the statutory 180-day payment rule under CGST Act Section 16(2).",
    image: "/images/features/tax-compliance.jpg",
    icon: ReceiptText,
    accentColor: "from-indigo-500 to-purple-500",
    badgeBg: "bg-indigo-500/10",
    badgeBorder: "border-indigo-500/30 text-indigo-400",
    highlights: [
      "Direct GSTIN Active & Filing Status Verification",
      "E-Invoice IRN Validation & QR Matching",
      "Section 16(2) 180-Day ITC Reversal Alerts",
    ],
    metrics: [
      { label: "Tax Standards", value: "GST + TDS" },
      { label: "IRN Verification", value: "Automated" },
      { label: "ITC Reversal Risk", value: "Guarded" },
    ],
  },
  {
    id: "leakage-analytics",
    tag: "CFO INTELLIGENCE & RECOVERY",
    title: "Recovered Capital & Financial Analytics",
    subtitle: "Executive command center for financial leakage containment",
    description:
      "Provides CFOs and procurement directors with live dashboards showing recovered capital, leakage breakdowns by supplier, risk distribution curves, and exportable audit evidence packages.",
    image: "/images/features/leakage-analytics.jpg",
    icon: TrendingDown,
    accentColor: "from-emerald-500 to-cyan-500",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30 text-emerald-400",
    highlights: [
      "Real-time Capital Leakage & Recovery Metrics",
      "Supplier Risk Integrity Scoring Matrix",
      "One-Click Court-Ready Audit & Dispute Packs",
    ],
    metrics: [
      { label: "Capital Protected", value: "₹4.2 Cr+" },
      { label: "Supplier Audits", value: "Continuous" },
      { label: "Audit Reports", value: "PDF & Excel" },
    ],
  },
];

export function LoginVisualPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance slide every 7 seconds unless hovered/interacted
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const current = FEATURES[activeIndex];
  const IconComponent = current.icon;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + FEATURES.length) % FEATURES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % FEATURES.length);
  };

  return (
    <div
      className="relative flex flex-col justify-between w-full h-full min-h-screen bg-[#060B14] text-white p-8 xl:p-12 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl opacity-20 transition-all duration-1000"
        style={{
          background:
            activeIndex === 0
              ? "radial-gradient(circle, #3B82F6 0%, #10B981 60%, transparent 100%)"
              : activeIndex === 1
              ? "radial-gradient(circle, #F59E0B 0%, #EF4444 60%, transparent 100%)"
              : activeIndex === 2
              ? "radial-gradient(circle, #6366F1 0%, #A855F7 60%, transparent 100%)"
              : "radial-gradient(circle, #10B981 0%, #06B6D4 60%, transparent 100%)",
        }}
      />

      {/* Top Bar: Interactive Feature Tabs */}
      <div className="relative z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Capabilities</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous feature"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-1">
              0{activeIndex + 1} / 0{FEATURES.length}
            </span>
            <button
              onClick={handleNext}
              aria-label="Next feature"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feature Selector Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {FEATURES.map((feature, idx) => {
            const TabIcon = feature.icon;
            const isActive = idx === activeIndex;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  isActive
                    ? "bg-slate-800/90 border-slate-700 shadow-lg text-white"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/70"
                }`}
              >
                <div
                  className={`p-1.5 rounded-md ${
                    isActive ? "bg-blue-600/20 text-blue-400" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                </div>
                <div className="hidden xl:block min-w-0">
                  <p className="text-xs font-medium truncate">{feature.title.split(" ")[0]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Showcase: AI Generated Image + Detailed Feature Card */}
      <div className="relative z-10 my-auto py-6 flex flex-col justify-center">
        {/* The Feature Preview Frame */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/70 shadow-2xl shadow-black/80 group">
          {/* Top Frame Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/70 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-slate-400 tracking-tight">
                ledgershield.ai/{current.id}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${current.badgeBorder} ${current.badgeBg}`}>
                {current.tag}
              </span>
            </div>
          </div>

          {/* AI Generated Image with Floating Badges */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
            />

            {/* Gradient Scrim for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

            {/* Floating Live Telemetry Badge over image */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg">
                <IconComponent className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-white tracking-tight">
                  {current.subtitle}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[11px] font-mono">
                <Sparkles className="h-3 w-3" />
                <span>AI Verified</span>
              </div>
            </div>
          </div>

          {/* Feature Narrative & Highlights */}
          <div className="p-6 bg-slate-950/95 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{current.title}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Bullet Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {current.highlights.map((highlight, hIdx) => (
                <div
                  key={hIdx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{highlight}</span>
                </div>
              ))}
            </div>

            {/* Live Metrics Row */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
              {current.metrics.map((metric, mIdx) => (
                <div key={mIdx}>
                  <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    {metric.label}
                  </p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Progress & Trust Footer */}
      <div className="relative z-20 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {FEATURES.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setActiveIndex(dotIdx)}
                aria-label={`Jump to slide ${dotIdx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  dotIdx === activeIndex ? "w-6 bg-blue-500" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {isPaused ? "Paused" : "Auto-cycling features"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Enterprise B2B SaaS</span>
          <span>•</span>
          <span>Multi-Tenant Architecture</span>
        </div>
      </div>
    </div>
  );
}
