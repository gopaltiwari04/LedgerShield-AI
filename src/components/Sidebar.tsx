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
  TrendingDown,
  Users,
} from "lucide-react";

export function Sidebar({ findingsCount }: { findingsCount?: number }) {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Reconciliation Workspace", href: "/reconciliation", icon: GitCompare },
    {
      name: "Discrepancy Findings",
      href: "/findings",
      icon: AlertTriangle,
      badge: findingsCount && findingsCount > 0 ? String(findingsCount) : undefined,
    },
    { name: "Document Center", href: "/documents", icon: FileText },
    { name: "Supplier Scorecard", href: "/suppliers", icon: Building2 },
    { name: "Rules & Controls", href: "/rules", icon: Sliders },
    { name: "Team & Permissions", href: "/team", icon: Users },
    { name: "Audit Reports", href: "/reports", icon: FileCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <div className="text-white font-bold tracking-tight text-base flex items-center gap-1.5">
            LedgerShield <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded border border-blue-500/30">AI</span>
          </div>
          <div className="text-[11px] text-slate-400">Financial Leakage & Audit</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge ? (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white text-blue-700"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Organization Tenant Indicator */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Tenancy Isolation
        </div>
        <div className="text-xs font-semibold text-white truncate">Role-Based & Encrypted</div>
        <div className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          Session Active
        </div>
      </div>
    </aside>
  );
}
