"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Building,
  ShieldCheck,
  ChevronDown,
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
        setTimeout(() => setSuccessBanner(null), 6000);
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-8 h-16 flex items-center justify-between">
        {/* Left: Organization context & Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {organizations.length > 1 ? (
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                <select
                  value={activeOrg?.id || ""}
                  onChange={(e) => handleSwitchOrg(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="font-semibold text-slate-800">
                {activeOrg?.name || "Mahindra Precision Eng"}
              </span>
            )}
            <span className="text-slate-300">/</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              FY 2024-25 Active
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
              {activeOrg?.currency || "INR"} (₹)
            </span>
          </div>
        </div>

        {/* Right: Actions, Verified RBAC Role badge, Logout */}
        <div className="flex items-center gap-3">
          {/* Verified Role Badge */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-slate-700 font-semibold">{role.replace(/_/g, " ")}</span>
          </div>

          {/* Trigger Reconciliation Run Button */}
          <button
            onClick={handleRunReconcile}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
              isRunning
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20"
            }`}
          >
            {isRunning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{isRunning ? "Reconciling..." : "Run Reconciliation"}</span>
          </button>

          {/* User profile avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-semibold text-xs">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser?.name || "Auditor"}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">{currentUser?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {successBanner && (
        <div className="bg-emerald-600 text-white px-8 py-2 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="underline text-[11px] opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
}
