import { GoogleGenAI } from "@google/genai";
import { prisma } from "../prisma";
import { formatINR } from "../currency";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotRequest {
  message: string;
  history?: ChatMessage[];
  currentPath?: string;
}

export interface ChatbotResponse {
  reply: string;
  provider: "google-gemini" | "deterministic-knowledge-base";
  suggestedQuestions?: string[];
}

/**
 * Sanitizes untrusted user input to mitigate prompt injection.
 */
function sanitizeInput(text: string, maxLength: number = 1000): string {
  if (!text) return "";
  let clean = text.slice(0, maxLength);
  clean = clean.replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, "[filtered injection directive]");
  clean = clean.replace(/system\s*:\s*/gi, "[filtered]");
  clean = clean.replace(/<\|.*?\|>/g, "");
  return clean.trim();
}

/**
 * Safe, read-only retrieval of the current organization's live posture.
 * Scoped strictly by organizationId from the verified user session.
 */
async function getOrganizationContext(organizationId: string) {
  try {
    const [org, findingsCount, invoicesCount, findings] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, currency: true, gstin: true },
      }),
      prisma.discrepancyFinding.count({
        where: { organizationId, status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      prisma.invoice.count({
        where: { organizationId },
      }),
      prisma.discrepancyFinding.findMany({
        where: { organizationId },
        select: { grossDiscrepancy: true, exposureGroupId: true, id: true },
      }),
    ]);

    // Calculate net unique exposure
    const exposureMap = new Map<string, number>();
    findings.forEach((f) => {
      const gid = f.exposureGroupId || f.id;
      const cur = exposureMap.get(gid) || 0;
      if (f.grossDiscrepancy > cur) exposureMap.set(gid, f.grossDiscrepancy);
    });
    let netExposure = 0;
    exposureMap.forEach((val) => (netExposure += val));

    return {
      name: org?.name || "Your Organization",
      currency: org?.currency || "INR",
      openFindingsCount: findingsCount,
      totalInvoices: invoicesCount,
      netExposureINR: netExposure,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Generates an authoritative system prompt containing LedgerShield product knowledge.
 */
function buildSystemInstruction(
  orgContext: { name: string; currency: string; openFindingsCount: number; totalInvoices: number; netExposureINR: number } | null,
  currentPath?: string
): string {
  const orgSummary = orgContext
    ? `AUTHENTICATED TENANT CONTEXT:
- Organization Name: ${orgContext.name}
- Default Currency: ${orgContext.currency}
- Open Discrepancy Findings: ${orgContext.openFindingsCount}
- Processed Invoices: ${orgContext.totalInvoices}
- Current Net Disputed Financial Exposure: ${formatINR(orgContext.netExposureINR)}`
    : "TENANT CONTEXT: Standard authenticated organization workspace.";

  return `You are the LedgerShield AI Assistant — the official in-product software guide, accounts payable controls expert, and forensic audit co-pilot.
Your mission is to help finance managers, procurement specialists, and internal auditors understand, navigate, and operate the LedgerShield AI platform.

${orgSummary}
CURRENT USER PAGE: ${currentPath || "/"}

CORE PRODUCT KNOWLEDGE BASE:
1. Executive Dashboard ("/")
   - Primary Metrics: Net Financial Exposure (strictly deduplicated to prevent double-counting across overlapping findings), Verified Savings Recovered, High & Critical Priority Findings, Unapplied Credits & Duplicates.
   - 4-Stage Recovery Pipeline: (1) Gross Identified Exposure -> (2) Net Unique Disputed -> (3) Confirmed by Auditor -> (4) Actually Recovered Cash.
   - Investigation Backlog Aging: Tracked across <7 days, 7-30 days, and >30 days.
   - Supplier Scorecard preview and quick action buttons.

2. Document Center / Vault ("/documents")
   - Ingestion formats supported: PDF, XLSX, CSV, TSV (up to 25 MB).
   - Ingestion Controls: Cryptographic SHA-256 checksums block duplicate document re-uploads.
   - OCR Extraction: Line-item descriptions, HSN/SAC codes, quantities, rates, and GST taxes are automatically extracted.
   - Field Verification: Users can click "Verify Fields" on any document to correct extracted values with a full audit trail.

3. Reconciliation Workbench ("/reconciliation")
   - Multi-way matching engine compares:
     * Purchase Order (PO): Approved quantities and benchmark unit prices.
     * Supplier Tax Invoice: Billed rates, line item totals, and 18% GST amounts.
     * Goods Receipt Note (GRN): Physical warehouse receipt, accepted quantities, and damaged/rejected shortages.
     * Bank Payments: RTGS/NEFT settlement references and UTR tracking.
   - Highlights rate deviations and unreceived quantities with specific variance tags.

4. Discrepancy Findings Queue ("/findings" and "/findings/[id]")
   - Filterable by Category, Severity (CRITICAL, HIGH, MEDIUM, LOW), and Status (OPEN, IN_REVIEW, CONFIRMED, RECOVERED, DISMISSED).
   - Finding Dossier ("/findings/[id]"):
     * Shows deterministic variance calculation formula.
     * Side-by-side comparison of approved benchmark vs observed billing.
     * Explainable Risk Score (0-100) combining Financial Impact, Mathematical Certainty, and Collusion Suspicion.
     * Google Gemini Co-Pilot generates neutral supplier clarification emails with 1-click clipboard copy.
     * Maker-Checker Disposition box allows auditors to confirm leakage, log recovery, or dismiss errors.

5. Supplier Audit Scorecard ("/suppliers")
   - Vendor history, total billed volume, active variances, open credits.
   - Payout Bank Details: Highlights Scenario F (shared bank account collusion alert if different vendors share identical bank credentials).

6. Forensic Controls & Tolerances ("/rules")
   - Unit price variance tolerance % (default 0.5%).
   - Quantity shortfall tolerance % (default 0.0% — zero tolerance for unreceived goods).
   - Duplicate lookback window in days (default 60 days).
   - Dual-authorization approval ceiling in INR (default ₹50,000 INR). Purchases exceeding this require Level 2 approval. Multiple purchases within 15% below this threshold trigger split-invoice alerts.
   - Segregation of Duties (SOD): Requisitioners cannot approve POs; AP operators cannot approve disbursements above ceilings without CFO sign-off.

7. Board Audit Reports ("/reports")
   - Generates 5 board-ready audit reports: (1) Executive Leakage Summary, (2) Supplier Statement Recon, (3) Duplicate Invoices & Payments Audit Trail, (4) Unapplied Supplier Credits Ledger, (5) Procurement Integrity & Collusion Audit.
   - Exportable directly as CSV or printable PDF.

8. Team & Permissions ("/team")
   - Role-Based Access Control (RBAC): ADMIN, INTERNAL_AUDITOR, FINANCE_MANAGER, AP_OPERATOR, WAREHOUSE_OPERATOR, READ_ONLY_EXEC.
   - Single-approver ceiling configuration for each member.

CRITICAL BEHAVIORAL INSTRUCTIONS:
- Give concise, actionable, and structured responses. Use markdown bolding, bullet points, and numbered steps when explaining workflows.
- Reference actual page routes (e.g. \`/documents\`, \`/findings\`, \`/rules\`) so users know exactly where to go.
- Understand Indian financial terminology: INR (₹), Lakhs, Crores, GSTIN, CGST, SGST, IGST, Challan, GRN, UTR, Debit Notes.
- NEVER accuse any supplier or employee of theft, fraud, or crime without human verification. State that discrepancies can arise from clerical mistakes, transit damages, or unlinked change orders.
- You CANNOT directly perform database mutations (you cannot approve recoveries, delete documents, change tolerances, or invite users via chat). Always guide the user to the appropriate screen button.
- If asked about the current tenant's statistics, use the authenticated tenant context provided above.
- If you do not know something, honestly state your limitation and direct the user to the appropriate workflow.`;
}

/**
 * Fallback knowledge-base responder when Gemini API key is unavailable or fails.
 */
function getDeterministicKBResponse(query: string, currentPath?: string): string {
  const q = query.toLowerCase();

  if (q.includes("upload") || q.includes("invoice") && (q.includes("how") || q.includes("where"))) {
    return `To upload invoices or purchase orders in LedgerShield AI:
1. Navigate to the **Document Center** at \`/documents\`.
2. Drag and drop your file into the upload zone, or click **"Select File from Device"**.
3. Supported formats include **PDF, XLSX, CSV, and TSV** (up to 25 MB).
4. LedgerShield automatically calculates a cryptographic **SHA-256 checksum** to prevent duplicate uploads, runs OCR extraction, and creates a line-item inventory.
5. You can inspect or correct extracted values anytime by clicking **"Verify Fields"**.`;
  }

  if (q.includes("reconciliation") || q.includes("3-way") || q.includes("three-way") || q.includes("match")) {
    return `**3-Way and 4-Way Reconciliation** in LedgerShield works as follows:
1. **Purchase Order (PO)** establishes the approved benchmark (authorized rate and quantity).
2. **Delivery Challan & Goods Receipt (GRN)** verifies physical warehouse receipts, noting accepted items vs damaged/rejected shortages.
3. **Tax Invoice** records the supplier's billing claim, unit rate, and 18% GST.
4. **Bank Settlement** tracks the UTR payment reference.

If the invoice rate exceeds the PO rate, or if billed quantity exceeds GRN accepted quantity, the system generates a deterministic discrepancy finding. You can inspect matches in the **Reconciliation Workbench** at \`/reconciliation\`.`;
  }

  if (q.includes("high-risk") || q.includes("risk score") || q.includes("severity")) {
    return `In LedgerShield, discrepancy findings are prioritized by an **Explainable Risk Score (0–100)**:
- **Critical (Score 80–100)**: Immediate financial leakage, high monetary exposure, or collusion signals (e.g., shared vendor bank accounts, severe price spikes).
- **High (Score 60–79)**: Material variances exceeding control tolerances or duplicate payment collisions.
- **Medium (Score 40–59)**: Quantity discrepancies with partial delivery history.
- **Low (Score 0–39)**: Minor rounding differences within acceptable thresholds.

You can filter and investigate open findings in the **Discrepancy Findings Queue** at \`/findings\`.`;
  }

  if (q.includes("report") || q.includes("export") || q.includes("board")) {
    return `To generate and export audit reports:
1. Navigate to **Audit Reports** at \`/reports\`.
2. Select from the 5 standard report types:
   - **Executive Financial Leakage Summary**
   - **Supplier Statement Reconciliation Report**
   - **Duplicate Invoices & Payments Audit Trail**
   - **Unapplied Supplier Credits Ledger**
   - **Procurement Integrity & Collusion Audit**
3. Click **"Export CSV"** to download the raw data or **"Print PDF"** to create a board-ready formal document.`;
  }

  if (q.includes("invite") || q.includes("team") || q.includes("role") || q.includes("user")) {
    return `To invite team members and set approval permissions:
1. Navigate to **Team & Governance** at \`/team\`.
2. Click **"Invite Team Member"**.
3. Enter their full name, work email address, and assigned role (\`INTERNAL_AUDITOR\`, \`FINANCE_MANAGER\`, \`AP_OPERATOR\`, etc.).
4. Set their **Approval Ceiling (₹)** to enforce maker-checker limits for disbursements.`;
  }

  if (q.includes("supplier") || q.includes("vendor") || q.includes("credit note")) {
    return `To manage and audit suppliers:
1. Visit the **Supplier Scorecard** at \`/suppliers\`.
2. Review vendor billing volumes, recurring discrepancy patterns, and open credit notes.
3. If a supplier has an **Unapplied Credit Note**, you can offset it directly against pending AP disbursements.
4. The system also flags **Scenario F Collusion Alerts** if multiple suppliers share an identical bank account.`;
  }

  if (q.includes("tolerance") || q.includes("rule") || q.includes("split")) {
    return `To configure financial tolerances and controls:
1. Navigate to **Rules & Controls** at \`/rules\`.
2. Configure **Unit Price Variance Tolerance** (default 0.5%) and **Quantity Shortfall Tolerance** (default 0.0%).
3. Adjust the **Duplicate Lookback Window** (default 60 days).
4. Set the **Dual Authorization Threshold** (default ₹50,000 INR). Purchases within 15% below this threshold automatically trigger split-invoice inspection.`;
  }

  return `I can help you with all LedgerShield AI workflows! Here are some common tasks:
- **Ingesting Documents**: Upload invoices, POs, and GRNs at \`/documents\`.
- **Investigating Discrepancies**: Review line-item evidence and risk scores at \`/findings\`.
- **Running 3-Way Reconciliation**: Verify matches side-by-side at \`/reconciliation\`.
- **Supplier Audit**: View vendor risk ratings and credit notes at \`/suppliers\`.
- **Exporting Reports**: Download executive summaries and audit trails at \`/reports\`.

Feel free to ask specific questions about any feature or troubleshooting step!`;
}

/**
 * Executes a conversational turn with Google Gemini (or deterministic fallback).
 */
export async function askChatbot(
  request: ChatbotRequest,
  organizationId: string
): Promise<ChatbotResponse> {
  const sanitizedQuery = sanitizeInput(request.message, 1000);
  if (!sanitizedQuery) {
    return {
      reply: "Please provide a question or topic so I can assist you.",
      provider: "deterministic-knowledge-base",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  // Check if Gemini is unconfigured
  if (!apiKey) {
    return {
      reply: getDeterministicKBResponse(sanitizedQuery, request.currentPath),
      provider: "deterministic-knowledge-base",
    };
  }

  try {
    const orgContext = await getOrganizationContext(organizationId);
    const systemPrompt = buildSystemInstruction(orgContext, request.currentPath);

    const ai = new GoogleGenAI({ apiKey });

    // Format conversation history for Gemini
    const formattedHistory = (request.history || []).slice(-6).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: sanitizeInput(msg.content, 1000) }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: sanitizedQuery }],
      },
    ];

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out after 15 seconds")), 15000)
    );

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUSER INQUIRY: ${sanitizedQuery}` }],
        },
      ],
      config: {
        temperature: 0.25, // factual and consistent
        maxOutputTokens: 1200,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const replyText = response.text?.trim();

    if (!replyText) {
      throw new Error("Empty response received from Gemini.");
    }

    return {
      reply: replyText,
      provider: "google-gemini",
    };
  } catch (error: any) {
    console.error("Gemini chatbot error, using fallback KB:", error.message);
    // Graceful deterministic fallback
    return {
      reply: getDeterministicKBResponse(sanitizedQuery, request.currentPath),
      provider: "deterministic-knowledge-base",
    };
  }
}
