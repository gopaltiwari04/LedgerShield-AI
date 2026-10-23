"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Building2,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";

export function Header({ onReconcileSuccess }: { onReconcileSuccess?: () => void }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [role, setRole] = useState<string>("INTERNAL_AUDITOR");
  const [isRunning, setIsRunning] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setActiveOrg(data.activeOrganization);
        setOrganizations(data.organizations || []);
        setRole(data.role);
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  };

  const handleSwitchOrg = async (targetOrgId: string) => {
    try {
      const res = await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetOrganizationId: targetOrgId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Switch org error:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handleRunReconcile = async () => {
    setIsRunning(true);
    setSuccessBanner(null);
    try {
      const res = await fetch("/api/reconcile/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccessBanner(
          `Reconciliation complete: ${data.documentsProcessed} documents scanned, ${data.findingsGenerated} findings evaluated.`
        );
        if (onReconcileSuccess) onReconcileSuccess();
        setTimeout(() => setSuccessBanner(null), 7000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "LS";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Organization context & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>

            {organizations.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors">
                <select
                  value={activeOrg?.id || ""}
                  onChange={(e) => handleSwitchOrg(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer pr-1"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {activeOrg?.name || "Mahindra Precision Eng"}
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-300">/</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              FY 2024-25 Active
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-mono font-medium">
              {activeOrg?.currency || "INR"} (₹)
            </span>
          </div>
        </div>

        {/* Right: Actions, RBAC Role badge, Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Verified Role Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>{role.replace(/_/g, " ")}</span>
          </div>

          {/* Trigger Reconciliation Run Button */}
          <button
            onClick={handleRunReconcile}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
              isRunning
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-brand shadow-blue-600/25"
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Reconciling...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Run 4-Way Reconciliation</span>
                <span className="sm:hidden">Run</span>
              </>
            )}
          </button>

          {/* User profile avatar & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {currentUser?.name || "Auditor"}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight font-mono truncate max-w-[120px]">
                {currentUser?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {successBanner && (
        <div className="bg-emerald-600 text-white px-6 lg:px-8 py-2.5 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[11px] font-semibold underline opacity-85 hover:opacity-100 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
}
