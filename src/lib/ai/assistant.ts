import { formatINR } from "../currency";
import { FindingItem } from "../types";
import { GeminiService, GeminiInvestigationResult } from "./gemini";

export interface AIInvestigationResponse {
  answer: string;
  verifiedFacts: string[];
  calculatedFinancialDifferences?: string[];
  hypotheses: string[];
  missingEvidence: string[];
  recommendedAuditorSteps: string[];
  supplierDraftEmail?: string;
  disclaimer: string;
  provider?: string;
  status?: string;
}

export class AIInvestigationService {
  /**
   * Async investigation powered by Google Gemini (with deterministic rule fallback).
   */
  public static async investigateWithGemini(
    finding: FindingItem,
    userQuery: string = "Explain this discrepancy and suggest next steps."
  ): Promise<AIInvestigationResponse> {
    const res: GeminiInvestigationResult = await GeminiService.investigateFinding(finding, userQuery);

    const answer = `### Investigation Summary: ${finding.title}
**AI Provider**: ${res.provider === "google-gemini" ? "Google Gemini (" + (res.modelUsed || "gemini-2.5-flash") + ")" : "Deterministic Audit Engine (Gemini Unconfigured)"}
**Status**: ${finding.status} | **Severity**: ${finding.severity} | **Risk Score**: ${finding.compositeRiskScore}/100

${res.executiveSummary}

#### Verified Documentary Facts
${res.verifiedFacts.map((f) => `- ${f}`).join("\n")}

#### Calculated Financial Differences
${res.calculatedFinancialDifferences.map((d) => `- ${d}`).join("\n")}

#### Plausible Hypotheses & Alternative Explanations
${res.hypotheses.map((h) => `- ${h}`).join("\n")}

#### Missing Documentation to Verify
${res.missingEvidence.map((m) => `- ${m}`).join("\n")}

#### Recommended Auditor Action
${res.recommendedAuditorSteps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}
`;

    return {
      answer,
      verifiedFacts: res.verifiedFacts,
      calculatedFinancialDifferences: res.calculatedFinancialDifferences,
      hypotheses: res.hypotheses,
      missingEvidence: res.missingEvidence,
      recommendedAuditorSteps: res.recommendedAuditorSteps,
      supplierDraftEmail: res.supplierDraftEmail,
      disclaimer: res.disclaimer,
      provider: res.provider,
      status: res.status,
    };
  }

  /**
   * Synchronous deterministic fallback investigation.
   */
  public static investigateFinding(
    finding: FindingItem,
    userQuery: string = "Explain this discrepancy and suggest next steps."
  ): AIInvestigationResponse {
    const verifiedFacts: string[] = [];
    const hypotheses: string[] = [];
    const missingEvidence: string[] = [];
    const recommendedAuditorSteps: string[] = [];

    // Extract facts directly from deterministic reconciliation record
    verifiedFacts.push(`Discrepancy Category: ${finding.category} (Rule ID: ${finding.ruleId})`);
    verifiedFacts.push(
      `Calculated Financial Exposure: ${formatINR(finding.grossDiscrepancy)} (Potential Recoverable: ${formatINR(finding.potentialRecoverable)})`
    );
    verifiedFacts.push(`Expected Benchmark: ${finding.expectedValue}`);
    verifiedFacts.push(`Observed Transaction Value: ${finding.observedValue}`);
    verifiedFacts.push(`Deterministic Variance Formula: ${finding.varianceCalculation}`);

    if (finding.evidences && finding.evidences.length > 0) {
      finding.evidences.forEach((ev) => {
        verifiedFacts.push(
          `Document Record: ${ev.documentType} #${ev.documentNumber} (${ev.sourceField}: ${ev.sourceValue})`
        );
      });
    }

    let specificContext = "";

    switch (finding.category) {
      case "PRICE_VARIANCE":
        specificContext = `The unit rate billed on invoice ${finding.invoiceNumber || "N/A"} diverges from the approved rate on PO ${finding.poNumber || "N/A"}.`;
        hypotheses.push("A legitimate price escalation or change order was agreed informally without updating the official Purchase Order.");
        hypotheses.push("A catalogue or rate card updated at year-end was applied retroactively by the vendor.");
        hypotheses.push("A clerical billing error occurred during supplier invoice preparation.");
        missingEvidence.push("Signed rate contract, master services agreement (MSA), or change order approval memos.");
        missingEvidence.push("Email correspondence between purchasing executive and vendor regarding price revisions.");
        recommendedAuditorSteps.push("Verify whether an unrecorded PO amendment or management exception was authorized.");
        recommendedAuditorSteps.push("If unauthorized, issue a debit note or deduct the variance from subsequent pending AP batches.");
        break;

      case "QUANTITY_SHORTAGE":
        specificContext = `Invoiced units exceed warehouse-accepted quantities documented in Goods Receipt Notes.`;
        hypotheses.push("The remaining balance of goods is currently in transit or held at the receiving bay awaiting quality inspection (QC clearance).");
        hypotheses.push("A partial delivery was made, and a subsequent shipment challan was not yet logged in the system.");
        hypotheses.push("Rejection of defective units occurred upon arrival, but the credit note from the supplier has not yet been processed.");
        missingEvidence.push("Signed transporter Lorry Receipt (LR), gate pass, or physical delivery challan.");
        missingEvidence.push("Warehouse quality inspection log or goods rejection memo.");
        recommendedAuditorSteps.push("Inspect warehouse physical receiving log to confirm whether a second delivery arrived.");
        recommendedAuditorSteps.push("Contact logistics coordinator for signed proof of delivery (POD).");
        break;

      case "DUPLICATE_PAYMENT":
        specificContext = `Multiple settlement records have been associated with a single invoice liability.`;
        hypotheses.push("Initial electronic fund transfer (NEFT/RTGS) appeared to fail or time out, prompting AP staff to initiate a duplicate payment.");
        hypotheses.push("Vendor submitted the invoice through both central AP and branch finance, causing dual processing.");
        missingEvidence.push("Bank statement clearing logs and bank reversal / refund records.");
        missingEvidence.push("Supplier ledger statement confirming receipt of both tranches.");
        recommendedAuditorSteps.push("Check bank reconciliation statement to see if one transaction bounced or reversed.");
        recommendedAuditorSteps.push("Request immediate formal refund or apply credit against outstanding vendor payables.");
        break;

      case "UNAPPLIED_CREDIT":
        specificContext = `A valid credit note issued by the supplier remains open and unapplied in AP sub-ledger.`;
        hypotheses.push("The credit note was received by procurement but not forwarded to the AP billing desk.");
        hypotheses.push("AP subledger entry was omitted during month-end closing.");
        missingEvidence.push("Original signed credit note document and reason for issuance.");
        recommendedAuditorSteps.push("Apply the credit note against the vendor's upcoming settlement run.");
        break;

      case "SPLIT_INVOICE":
        specificContext = `Multiple invoices were submitted near the threshold limit (${formatINR(50000)}) in close proximity.`;
        hypotheses.push("Vendor billed work milestones or deliveries incrementally as work progressed.");
        hypotheses.push("Buyer or vendor purposefully split a single procurement to avoid higher approval tiers.");
        missingEvidence.push("Original procurement requisition and quote request.");
        recommendedAuditorSteps.push("Check if these invoices relate to a single scope of work or project.");
        break;

      default:
        specificContext = `Discrepancy identified based on configured financial controls.`;
        hypotheses.push("Transaction data entry irregularity or timing discrepancy.");
        missingEvidence.push("Complete source documents and approval trail.");
        recommendedAuditorSteps.push("Conduct secondary document audit with the responsible buyer.");
        break;
    }

    const supplierDraftEmail = `Subject: Clarification Request: Invoice ${finding.invoiceNumber || finding.findingCode} - Reference ${finding.poNumber || "Account Statement"}

Dear Accounts Team at ${finding.supplierName || "Supplier"},

During our routine accounts payable reconciliation for the recent billing cycle, our audit team identified a variance requiring your confirmation regarding the following record:

- Reference: Invoice ${finding.invoiceNumber || "N/A"} (Date: ${new Date().toLocaleDateString("en-IN")})
- Purchase Order Reference: ${finding.poNumber || "N/A"}
- Variance Detail: ${finding.title}
- Discrepancy Amount: ${formatINR(finding.grossDiscrepancy)}
- Calculation Context: ${finding.varianceCalculation}

To ensure timely settlement and alignment between our respective books of accounts, could you please provide:
1. Copy of signed delivery challan / transport LR or approved rate amendment.
2. An updated statement of account indicating whether a credit note has been issued.

We appreciate your prompt assistance in resolving this matter so we may finalize processing.

Warm regards,
Finance & Internal Controls Team
LedgerShield Platform`;

    const answer = `### Investigation Summary: ${finding.title}
**Status**: ${finding.status} | **Severity**: ${finding.severity} | **Risk Score**: ${finding.compositeRiskScore}/100

${specificContext}

#### Verified Documentary Facts
${verifiedFacts.map((f) => `- ${f}`).join("\n")}

#### Plausible Hypotheses & Alternative Explanations
${hypotheses.map((h) => `- ${h}`).join("\n")}

#### Missing Documentation to Verify
${missingEvidence.map((m) => `- ${m}`).join("\n")}

#### Recommended Auditor Action
${recommendedAuditorSteps.map((s) => `1. ${s}`).join("\n")}
`;

    return {
      answer,
      verifiedFacts,
      hypotheses,
      missingEvidence,
      recommendedAuditorSteps,
      supplierDraftEmail,
      disclaimer:
        "LedgerShield AI provides evidence-grounded financial analysis based on authorized transaction records. Discrepancies are highlighted for verification and do not constitute legal conclusions or allegations of wrongdoing.",
      provider: "deterministic-rules",
      status: "unconfigured",
    };
  }
}
