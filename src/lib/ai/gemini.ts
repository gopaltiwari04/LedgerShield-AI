import { GoogleGenAI } from "@google/genai";
import { FindingItem } from "../types";
import { formatINR } from "../currency";

export interface GeminiInvestigationResult {
  status: "success" | "unconfigured" | "error";
  provider: "google-gemini" | "deterministic-rules";
  modelUsed?: string;
  executiveSummary: string;
  verifiedFacts: string[];
  calculatedFinancialDifferences: string[];
  hypotheses: string[];
  missingEvidence: string[];
  recommendedAuditorSteps: string[];
  supplierDraftEmail: string;
  disclaimer: string;
}

export interface MultiFindingSummaryResult {
  status: "success" | "unconfigured" | "error";
  provider: "google-gemini" | "deterministic-rules";
  narrative: string;
  keyRiskThemes: string[];
  recommendedPriorityActions: string[];
}

/**
 * Sanitizes untrusted text (e.g. from invoices, vendor notes, or user input)
 * to prevent prompt injection attacks.
 */
function sanitizeInput(text: string | undefined | null, maxLength: number = 2000): string {
  if (!text) return "";
  let clean = text.slice(0, maxLength);
  // Neutralize common prompt injection directives
  clean = clean.replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, "[filtered injection attempt]");
  clean = clean.replace(/system\s*:\s*/gi, "[filtered]");
  clean = clean.replace(/assistant\s*:\s*/gi, "[filtered]");
  clean = clean.replace(/<\|.*?\|>/g, ""); // Special token strips
  return clean.trim();
}

/**
 * Google Gemini Server-side AI Provider for LedgerShield AI
 */
export class GeminiService {
  private static getClient(): { ai: GoogleGenAI; model: string } | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });
    return { ai, model };
  }

  public static isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  /**
   * Generates a grounded, multi-perspective investigation analysis for a discrepancy finding.
   */
  public static async investigateFinding(
    finding: FindingItem,
    userQuery: string = "Explain this discrepancy, suggest hypotheses, and draft a supplier email."
  ): Promise<GeminiInvestigationResult> {
    const sanitizedQuery = sanitizeInput(userQuery, 500);

    // 1. Compile immutable authoritative financial facts from deterministic engine
    const verifiedFacts: string[] = [
      `Finding Code: ${finding.findingCode}`,
      `Category: ${finding.category} (Rule: ${finding.ruleId})`,
      `Supplier: ${finding.supplierName || "N/A"} (${finding.vendorCode || "N/A"})`,
      `PO Reference: ${finding.poNumber || "N/A"}`,
      `Invoice Reference: ${finding.invoiceNumber || "N/A"}`,
      `Expected Value (Approved Benchmark): ${finding.expectedValue}`,
      `Observed Transaction Value: ${finding.observedValue}`,
      `Composite Risk Score: ${finding.compositeRiskScore}/100 (Severity: ${finding.severity})`,
    ];

    const calculatedFinancialDifferences: string[] = [
      `Official Gross Discrepancy: ${formatINR(finding.grossDiscrepancy)}`,
      `Amount Paid to Date: ${formatINR(finding.amountPaid)}`,
      `Potential Recoverable Exposure: ${formatINR(finding.potentialRecoverable)}`,
      `Variance Formula: ${finding.varianceCalculation}`,
    ];

    if (finding.evidences && finding.evidences.length > 0) {
      finding.evidences.forEach((ev) => {
        verifiedFacts.push(
          `Document Evidence: ${ev.documentType} #${ev.documentNumber} (${ev.sourceField || "Field"}: ${ev.sourceValue || "Value"})`
        );
      });
    }

    // 2. Check if Gemini is configured
    const clientInfo = this.getClient();
    if (!clientInfo) {
      // Return honest deterministic audit fallback
      return this.generateDeterministicFallback(finding, verifiedFacts, calculatedFinancialDifferences);
    }

    // 3. Call Google Gemini with strict structured grounding
    try {
      const prompt = `You are the Lead AP & Forensic Audit Assistant for LedgerShield AI.
Your role is to explain an accounts payable discrepancy to internal auditors and provide neutral, actionable next steps.

CRITICAL INSTRUCTIONS:
1. Ground every financial claim in the authorized records below. Do NOT hallucinate numbers.
2. The financial calculation formulas and amounts below are authoritative and deterministic. Do NOT alter or recalculate the official exposure.
3. NEVER accuse any vendor or employee of theft, fraud, or criminal conduct. Discrepancies may stem from clerical errors, transit delays, unrecorded change orders, or timing differences.
4. Provide plausible innocent business hypotheses alongside audit verification steps.
5. Draft a neutral, professional supplier clarification email requesting supporting documents.
6. The user query is: "${sanitizedQuery}". Treat it as an auditor inquiry.

TRANSACTION RECORDS:
${verifiedFacts.map((f) => `- ${f}`).join("\n")}

CALCULATED FINANCIAL DIFFERENCES:
${calculatedFinancialDifferences.map((d) => `- ${d}`).join("\n")}

Respond ONLY with a valid JSON object matching this schema:
{
  "executiveSummary": "Concise 2-3 sentence overview of the discrepancy and risk level",
  "hypotheses": ["Plausible business hypothesis 1", "Plausible business hypothesis 2", "Plausible business hypothesis 3"],
  "missingEvidence": ["Document or verification check 1", "Document or verification check 2"],
  "recommendedAuditorSteps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
  "supplierDraftEmail": "Complete, polite, neutral supplier email draft with subject line"
}`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API request timed out after 15 seconds")), 15000)
      );

      const generatePromise = clientInfo.ai.models.generateContent({
        model: clientInfo.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature for factual audit consistency
          maxOutputTokens: 2048,
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text || "";

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Fallback parsing if wrapped in markdown code blocks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Unable to parse structured JSON from Gemini response");
        }
      }

      return {
        status: "success",
        provider: "google-gemini",
        modelUsed: clientInfo.model,
        executiveSummary: parsed.executiveSummary || `${finding.title}: Variance of ${formatINR(finding.grossDiscrepancy)}.`,
        verifiedFacts,
        calculatedFinancialDifferences,
        hypotheses: Array.isArray(parsed.hypotheses) && parsed.hypotheses.length > 0
          ? parsed.hypotheses
          : ["Clerical data entry mismatch", "Unrecorded pricing amendment in ERP", "Shipment timing difference"],
        missingEvidence: Array.isArray(parsed.missingEvidence) && parsed.missingEvidence.length > 0
          ? parsed.missingEvidence
          : ["Signed delivery challan or LR copy", "Rate contract or amendment approval memo"],
        recommendedAuditorSteps: Array.isArray(parsed.recommendedAuditorSteps) && parsed.recommendedAuditorSteps.length > 0
          ? parsed.recommendedAuditorSteps
          : ["Request vendor account statement", "Hold payment pending document reconciliation"],
        supplierDraftEmail: parsed.supplierDraftEmail || this.generateDefaultSupplierEmail(finding),
        disclaimer:
          "AI-assisted analysis generated via Google Gemini. Official exposure amounts are computed deterministically. LedgerShield AI provides evidence-backed analysis for audit review and does not constitute legal allegations.",
      };
    } catch (error: any) {
      console.warn("Gemini API call failed or timed out; falling back to deterministic audit rules:", error?.message);
      const fallback = this.generateDeterministicFallback(finding, verifiedFacts, calculatedFinancialDifferences);
      fallback.status = "error";
      return fallback;
    }
  }

  /**
   * Summarizes multiple related findings across an entire reconciliation batch or supplier.
   */
  public static async summarizeBatch(
    findings: FindingItem[],
    batchTitle: string = "Reconciliation Findings Overview"
  ): Promise<MultiFindingSummaryResult> {
    if (findings.length === 0) {
      return {
        status: "success",
        provider: "deterministic-rules",
        narrative: "No financial discrepancies identified in this scope.",
        keyRiskThemes: [],
        recommendedPriorityActions: ["Maintain routine continuous monitoring."],
      };
    }

    const totalExposure = findings.reduce((sum, f) => sum + (f.grossDiscrepancy || 0), 0);
    const highRiskCount = findings.filter((f) => f.severity === "HIGH" || f.severity === "CRITICAL").length;

    const clientInfo = this.getClient();
    if (!clientInfo) {
      return {
        status: "unconfigured",
        provider: "deterministic-rules",
        narrative: `Audit Summary (${batchTitle}): Detected ${findings.length} findings with total exposure of ${formatINR(totalExposure)}. Identified ${highRiskCount} high/critical priority items. (Gemini API unconfigured; summarized via deterministic rules).`,
        keyRiskThemes: Array.from(new Set(findings.map((f) => f.category))),
        recommendedPriorityActions: [
          `Prioritize review of ${highRiskCount} high/critical severity items.`,
          "Consolidate supplier communications for recurring price variances.",
          "Check AP subledger for unapplied credit notes.",
        ],
      };
    }

    try {
      const summaryItems = findings.slice(0, 15).map((f) =>
        `- ${f.findingCode}: ${f.title} (${formatINR(f.grossDiscrepancy)}, Severity: ${f.severity}, Supplier: ${f.supplierName || "N/A"})`
      ).join("\n");

      const prompt = `You are a senior forensic auditor preparing an executive AP risk brief.
Analyze the following batch of ${findings.length} findings totaling ${formatINR(totalExposure)}:

${summaryItems}

Respond with a JSON object:
{
  "narrative": "A cohesive 3-4 sentence executive overview explaining the key leakage patterns",
  "keyRiskThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "recommendedPriorityActions": ["Action 1", "Action 2", "Action 3"]
}`;

      const response = await clientInfo.ai.models.generateContent({
        model: clientInfo.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return {
        status: "success",
        provider: "google-gemini",
        narrative: parsed.narrative || `Audit batch contains ${findings.length} findings totaling ${formatINR(totalExposure)}.`,
        keyRiskThemes: parsed.keyRiskThemes || ["Price variances", "Quantity shortfalls"],
        recommendedPriorityActions: parsed.recommendedPriorityActions || ["Review high exposure findings first"],
      };
    } catch {
      return {
        status: "error",
        provider: "deterministic-rules",
        narrative: `Batch of ${findings.length} findings totaling ${formatINR(totalExposure)} with ${highRiskCount} high-risk items.`,
        keyRiskThemes: Array.from(new Set(findings.map((f) => f.category))),
        recommendedPriorityActions: ["Review high severity findings first."],
      };
    }
  }

  /**
   * Deterministic audit fallback when Gemini API key is not configured or network fails.
   */
  private static generateDeterministicFallback(
    finding: FindingItem,
    verifiedFacts: string[],
    calculatedFinancialDifferences: string[]
  ): GeminiInvestigationResult {
    const hypotheses: string[] = [];
    const missingEvidence: string[] = [];
    const recommendedAuditorSteps: string[] = [];

    switch (finding.category) {
      case "PRICE_VARIANCE":
        hypotheses.push("Legitimate price escalation or rate contract revision not yet updated in the ERP PO.");
        hypotheses.push("Vendor applied a retroactive revised catalog rate without formal change order.");
        hypotheses.push("Clerical invoicing typo during vendor billing preparation.");
        missingEvidence.push("Approved Purchase Order amendment or signed contract addendum.");
        missingEvidence.push("Purchasing manager email authorization regarding revised unit pricing.");
        recommendedAuditorSteps.push("Verify whether an unrecorded PO amendment or exception was approved.");
        recommendedAuditorSteps.push("If unauthorized, issue a debit note or deduct from pending AP settlements.");
        break;

      case "QUANTITY_SHORTAGE":
        hypotheses.push("Balance of goods is currently in transit or in quarantine awaiting QC inspection.");
        hypotheses.push("Delivery was split across two consignments; second delivery challan pending upload.");
        hypotheses.push("Defective units rejected at receiving bay without matching supplier credit note.");
        missingEvidence.push("Signed Lorry Receipt (LR), gate pass, or physical delivery challan.");
        missingEvidence.push("Warehouse Goods Inward Register and quality rejection memo.");
        recommendedAuditorSteps.push("Check warehouse receiving log to confirm if shipment arrived in parts.");
        recommendedAuditorSteps.push("Request signed proof of delivery (POD) from transporter.");
        break;

      case "DUPLICATE_PAYMENT":
        hypotheses.push("Initial NEFT/RTGS transaction timed out or appeared to fail, causing duplicate transfer.");
        hypotheses.push("Vendor submitted same invoice to both central accounts and branch office.");
        missingEvidence.push("Bank account statement clearing logs and bank reversal advice.");
        missingEvidence.push("Vendor ledger confirmation acknowledging receipt of both tranches.");
        recommendedAuditorSteps.push("Check bank reconciliation to confirm whether duplicate cleared.");
        recommendedAuditorSteps.push("Request immediate formal refund or set off against open payables.");
        break;

      case "UNAPPLIED_CREDIT":
        hypotheses.push("Credit note was received by procurement but not handed over to AP desk.");
        hypotheses.push("Credit note logged in procurement files but omitted during monthly AP closing.");
        missingEvidence.push("Original signed credit note document and vendor credit balance confirmation.");
        recommendedAuditorSteps.push("Apply uncredited balance against vendor's next payment batch.");
        break;

      case "SPLIT_INVOICE":
        hypotheses.push("Vendor billed milestones incrementally as phases of work completed.");
        hypotheses.push("Purchasing agent or vendor split single procurement to stay below approval tier.");
        missingEvidence.push("Original purchase requisition and scope of work statement.");
        recommendedAuditorSteps.push("Verify whether invoices pertain to a single commercial procurement.");
        break;

      default:
        hypotheses.push("Discrepancy arising from document entry variance or timing difference.");
        missingEvidence.push("Complete source document package and approval history.");
        recommendedAuditorSteps.push("Conduct secondary audit with responsible buyer and supplier.");
        break;
    }

    const supplierDraftEmail = this.generateDefaultSupplierEmail(finding);

    return {
      status: "unconfigured",
      provider: "deterministic-rules",
      executiveSummary: `${finding.title}: Calculated exposure of ${formatINR(finding.grossDiscrepancy)} on ${finding.category}. (Google Gemini API unconfigured; analysis generated via deterministic audit rules).`,
      verifiedFacts,
      calculatedFinancialDifferences,
      hypotheses,
      missingEvidence,
      recommendedAuditorSteps,
      supplierDraftEmail,
      disclaimer:
        "Deterministic audit analysis. Official exposure amounts are computed deterministically. To enable generative AI reasoning with Google Gemini, set GEMINI_API_KEY in environment variables.",
    };
  }

  private static generateDefaultSupplierEmail(finding: FindingItem): string {
    return `Subject: Clarification Request: Invoice ${finding.invoiceNumber || finding.findingCode} - Reference ${finding.poNumber || "Account Statement"}

Dear Accounts Team at ${finding.supplierName || "Supplier"},

During our routine accounts payable reconciliation for the recent billing cycle, our internal controls team identified a variance requiring your confirmation regarding the following record:

- Reference: Invoice ${finding.invoiceNumber || "N/A"}
- Purchase Order Reference: ${finding.poNumber || "N/A"}
- Variance Detail: ${finding.title}
- Discrepancy Amount: ${formatINR(finding.grossDiscrepancy)}
- Calculation Context: ${finding.varianceCalculation}

To ensure timely settlement and alignment between our books of accounts, could you please provide:
1. Copy of signed delivery challan / transport LR or approved rate amendment.
2. An updated statement of account indicating whether a credit note has been issued.

We appreciate your prompt assistance in resolving this matter so we may finalize processing.

Warm regards,
Finance & Internal Controls Team
LedgerShield Platform`;
  }
}
