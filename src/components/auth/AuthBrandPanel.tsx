"use client";

import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Lock,
  Building2,
  FileCheck2,
  Zap,
} from "lucide-react";

export function AuthBrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-full h-full bg-[#070D18] text-white p-12 overflow-hidden border-l border-slate-800/80 select-none">
      {/* Background Gradients & Ambient Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Brand Identity */}
      <div className="relative z-10 space-y-4 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25 tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          AUTONOMOUS FORENSIC AP RECONCILIATION
        </div>

        <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
          Every rupee accounted for.
        </h2>

        <p className="text-slate-300 text-sm leading-relaxed">
          Continuous 3-way matching and forensic procurement intelligence. LedgerShield isolates price variances, quantity shortfalls, duplicate payouts, and unapplied supplier credits before cash leaves your accounts.
        </p>
      </div>

      {/* Centerpiece: Dynamic Live Financial Intelligence Stack */}
      <div className="relative z-10 my-6 space-y-4 max-w-xl">
        {/* Floating Card 1: Live Intercepted Overcharge */}
        <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-slate-900/80 shadow-elevated animate-float-slow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-rose-500/20 text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-rose-300 tracking-wide">
                PRICE OVERCHARGE INTERCEPTED
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Risk Score: 94/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs py-2 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">PO #2024-884 Rate</span>
              <span className="font-semibold text-slate-200">500 pcs @ ₹1,050/pc</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Invoice #INV-9411 Rate</span>
              <span className="font-semibold text-rose-400">500 pcs @ ₹1,290/pc</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-500" />
              Supplier: Apex Heavy Castings Ltd
            </span>
            <span className="font-mono font-bold text-rose-300">
              Leakage: +₹1,20,000 (+22.8%)
            </span>
          </div>
        </div>

        {/* Floating Card 2: 4-Way Matching Flow */}
        <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-slate-900/80 shadow-elevated">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-400">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-blue-300 tracking-wide">
                DETERMINISTIC 4-WAY VERIFICATION
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              100% Corroborated
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-300">
            <div className="flex-1 py-1.5 px-2 rounded bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">PO</span>
              <span className="font-semibold text-slate-200">₹8,40,000</span>
            </div>
            <span className="text-slate-600 font-bold">→</span>
            <div className="flex-1 py-1.5 px-2 rounded bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">CHALLAN</span>
              <span className="font-semibold text-slate-200">1,200 pcs</span>
            </div>
            <span className="text-slate-600 font-bold">→</span>
            <div className="flex-1 py-1.5 px-2 rounded bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block">GRN</span>
              <span className="font-semibold text-slate-200">1,200 pcs</span>
            </div>
            <span className="text-slate-600 font-bold">→</span>
            <div className="flex-1 py-1.5 px-2 rounded bg-emerald-950/40 border border-emerald-500/40 text-center">
              <span className="text-[9px] text-emerald-400 block">SETTLED</span>
              <span className="font-semibold text-emerald-300">₹8,40,000</span>
            </div>
          </div>
        </div>

        {/* Floating Card 3: Duplicate Payment Interception */}
        <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/25 bg-slate-900/80 shadow-glow-emerald animate-float-delayed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-xs font-bold text-emerald-300">
                  DUPLICATE PAYMENT OUTFLOW HALTED
                </div>
                <div className="text-[11px] text-slate-400">
                  Colliding invoice hash matching TXN #RTGS-89101
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-emerald-400">₹4,85,000</div>
              <div className="text-[10px] text-emerald-500 font-medium">100% Cash Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Real-time Stats & Security Attestation */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 space-y-4 max-w-xl">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-base font-extrabold text-white font-mono">₹1.84 Cr+</div>
            <div className="text-[10px] text-slate-400 font-medium">Audited & Recovered</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-base font-extrabold text-blue-400 font-mono">0.00%</div>
            <div className="text-[10px] text-slate-400 font-medium">Math Drift (Exact)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-base font-extrabold text-emerald-400 font-mono">27 States</div>
            <div className="text-[10px] text-slate-400 font-medium">GST Rule Engine</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            AES-256 Multi-Tenant Isolation
          </span>
          <span>SOC 2 Type II Certified Architecture</span>
        </div>
      </div>
    </div>
  );
}
