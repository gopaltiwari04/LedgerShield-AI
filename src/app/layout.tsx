import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "LedgerShield AI - B2B Financial Leakage & Procurement Fraud Investigation Platform",
  description: "Detect financial leakage, billing errors, duplicate payments, missing credits, and procurement collusion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900 flex antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
