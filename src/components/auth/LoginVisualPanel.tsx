"use client";

export function LoginVisualPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-full h-full bg-[#080E1A] text-white p-12 xl:p-16 overflow-hidden select-none border-l border-slate-800/60">
      {/* Subtle radial ambient lighting behind the centerpiece */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(16, 185, 129, 0.06) 45%, transparent 70%)",
        }}
      />

      {/* Top subtle badge */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-slate-400 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>LedgerShield Intelligence</span>
        </div>
      </div>

      {/* Centerpiece: Single cohesive, striking abstract shield & financial flow visual */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-8">
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Subtle outer geometric orbit ring */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none animate-[spin_60s_linear_infinite]"
            viewBox="0 0 320 320"
            fill="none"
          >
            <circle
              cx="160"
              cy="160"
              r="148"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <circle
              cx="160"
              cy="160"
              r="124"
              stroke="rgba(59, 130, 246, 0.15)"
              strokeWidth="1"
            />
            {/* Verification tick nodes */}
            <circle cx="160" cy="12" r="2.5" fill="#3B82F6" />
            <circle cx="308" cy="160" r="2" fill="#10B981" />
            <circle cx="160" cy="308" r="2" fill="#64748B" />
            <circle cx="12" cy="160" r="2" fill="#3B82F6" />
          </svg>

          {/* Middle geometric frame */}
          <svg
            className="absolute w-60 h-60 pointer-events-none"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle
              cx="120"
              cy="120"
              r="96"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
            <polygon
              points="120,28 198,74 198,166 120,212 42,166 42,74"
              stroke="rgba(59, 130, 246, 0.22)"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
          </svg>

          {/* Core Shield & Data Convergence Iconography */}
          <div className="relative z-10 w-36 h-36 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-md">
            <svg
              className="w-20 h-20 text-blue-500"
              viewBox="0 0 80 80"
              fill="none"
            >
              {/* Outer shield boundary */}
              <path
                d="M40 8L64 18V38C64 53.5 53.8 67.8 40 72C26.2 67.8 16 53.5 16 38V18L40 8Z"
                stroke="url(#shieldGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner geometric faceted core */}
              <path
                d="M40 22L54 28.5V40C54 48.5 48 57.5 40 60C32 57.5 26 48.5 26 40V28.5L40 22Z"
                fill="rgba(37, 99, 235, 0.12)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
              />
              {/* Reconciliation balance mark */}
              <path
                d="M32 40L38 46L50 34"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Converging flow lines */}
              <circle cx="40" cy="8" r="2" fill="#60A5FA" />
              <circle cx="64" cy="18" r="2" fill="#60A5FA" />
              <circle cx="16" cy="18" r="2" fill="#60A5FA" />

              <defs>
                <linearGradient id="shieldGrad" x1="16" y1="8" x2="64" y2="72" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60A5FA" />
                  <stop offset="0.6" stopColor="#2563EB" />
                  <stop offset="1" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Narrative */}
        <div className="mt-8 text-center max-w-md space-y-2.5">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Clarity in every transaction.
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Continuous deterministic reconciliation and forensic procurement integrity for modern accounts payable.
          </p>
        </div>
      </div>

      {/* Bottom subtle trust mark */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-500 pt-4 border-t border-slate-800/40">
        <span>Deterministic 3-Way Audit</span>
        <span>256-bit Tenant Encryption</span>
      </div>
    </div>
  );
}
