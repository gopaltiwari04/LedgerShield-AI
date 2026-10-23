"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  if (isAuthPage) {
    return (
      <main className="min-h-screen bg-[#060B14] text-white">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex w-full antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
