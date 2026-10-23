"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Successful login -> navigate to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoRole: "auditor" | "cfo") => {
    if (demoRole === "auditor") {
      setEmail("auditor@mahindra.com");
      setPassword("AuditorSecurePass#2024");
    } else {
      setEmail("cfo@mahindra.com");
      setPassword("CfoSecurePass#2024");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#060B14]">
      {/* Left Column: Form & Interaction Zone */}
      <div className="w-full lg:w-[48%] xl:w-[44%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-10 bg-slate-950">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight text-lg flex items-center gap-1.5">
                LedgerShield <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded border border-blue-500/30">AI</span>
              </div>
              <div className="text-[11px] text-slate-400">Financial Leakage & Procurement Audit</div>
            </div>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Production Active
          </span>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome to Workspace
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Enter your enterprise credentials to access forensic audit queues and multi-tenant ledger accounts.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="auditor@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  href="/login"
                  onClick={() => alert("To reset your password, contact your organization admin or use the reset API workflow.")}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-brand transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Sign in to Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Pilot / Demo Quick Fill Helper */}
          <div className="mt-6 pt-5 border-t border-slate-900">
            <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Pilot Reviewer Quick-Access:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo("auditor")}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Lead Auditor</span>
                <span className="text-[10px] text-blue-400 font-mono">Fill</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("cfo")}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>CFO / Approver</span>
                <span className="text-[10px] text-purple-400 font-mono">Fill</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Don&apos;t have an organization workspace? </span>
            <Link
              href="/register"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Create Business Account →
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-4 border-t border-slate-900">
          <span>&copy; {new Date().getFullYear()} LedgerShield AI Systems</span>
          <span className="font-mono">v1.2.0-prod</span>
        </div>
      </div>

      {/* Right Column: Full-Height Immersive Brand Experience */}
      <div className="hidden lg:flex flex-1">
        <AuthBrandPanel />
      </div>
    </div>
  );
}
