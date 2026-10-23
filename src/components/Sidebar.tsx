"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitCompare,
  AlertTriangle,
  FileText,
  Building2,
  Sliders,
  FileCheck,
  ShieldAlert,
  ChevronRight,
  Users,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";

export function Sidebar({ findingsCount }: { findingsCount?: number }) {
  const pathname = usePathname();

  const navigationGroups = [
    {
      group: "AUDIT WORKSPACE",
      items: [
        { name: "Executive Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Reconciliation Workbench", href: "/reconciliation", icon: GitCompare },
        {
          name: "Discrepancy Findings",
          href: "/findings",
          icon: AlertTriangle,
          badge: findingsCount && findingsCount > 0 ? String(findingsCount) : undefined,
          isAlert: true,
        },
        { name: "Document Vault", href: "/documents", icon: FileText },
      ],
    },
    {
      group: "INTELLIGENCE & VENDORS",
      items: [
        { name: "Supplier Scorecards", href: "/suppliers", icon: Building2 },
        { name: "Forensic Rules & Limits", href: "/rules", icon: Sliders },
        { name: "Board Audit Reports", href: "/reports", icon: FileCheck },
      ],
    },
    {
      group: "GOVERNANCE",
      items: [
        { name: "Team & Maker-Checker", href: "/team", icon: Users },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0A101D] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800/80 z-20 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-brand shadow-blue-500/20 shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-white font-extrabold tracking-tight text-sm flex items-center gap-1.5">
            <span>LedgerShield</span>
            <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 font-bold px-1.5 py-0.2 rounded border border-blue-500/30">
              AI
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate">
            Financial Leakage & Audit
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto dark-scrollbar">
        {navigationGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {group.group}
            </div>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge ? (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white text-blue-700"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="h-3 w-3 opacity-70 shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Tenancy & Security Badge Footer */}
      <div className="p-3.5 m-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>TENANT ISOLATION</span>
          </div>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-200 truncate">
          Deterministic Rule Engine
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
          AES-256 Multi-Tenant DB
        </div>
      </div>
    </aside>
  );
}
