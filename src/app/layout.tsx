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
    <html lang="en" className="h-full">
      <body className="min-h-screen w-full bg-[#070D18] text-slate-900 antialiased flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
