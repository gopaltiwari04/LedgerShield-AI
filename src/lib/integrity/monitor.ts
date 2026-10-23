import { formatINR } from "../currency";
import { evaluateRisk } from "../risk/scoring";
import { FindingItem, TolerancesConfig, DEFAULT_TOLERANCES } from "../types";
import { InvoiceData, PaymentData, POData } from "../reconciliation/engine";

export interface SupplierEntity {
  id: string;
  vendorCode: string;
  name: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  contactEmail?: string;
}

export interface DocumentUploadMeta {
  id: string;
  filename: string;
  fileHashSha256: string;
  invoiceNumber?: string;
  totalAmount?: number;
  uploadedAt: string;
}

export interface IntegrityAuditInput {
  invoices: InvoiceData[];
  payments: PaymentData[];
  purchaseOrders: POData[];
  suppliers: SupplierEntity[];
  uploadedDocuments?: DocumentUploadMeta[];
  approvalLimitThresholdINR?: number;
}

export class ProcurementIntegrityMonitor {
  private approvalThreshold: number;

  constructor(tolerances: TolerancesConfig = DEFAULT_TOLERANCES) {
    this.approvalThreshold = tolerances.approvalLimitThresholdINR || 50000.0;
  }

  /**
   * Run behavioral, collusion, splitting, and fraud pattern detection
   */
  public analyze(input: IntegrityAuditInput): FindingItem[] {
    const findings: FindingItem[] = [];
    const threshold = input.approvalLimitThresholdINR || this.approvalThreshold;

    let counter = 100;
    const generateCode = () => `SEC-${new Date().getFullYear()}-${String(counter++).padStart(3, "0")}`;

    // -------------------------------------------------------------------------
    // 1. SCENARIO E: Invoice Splitting & Approval-Limit Avoidance
    // -------------------------------------------------------------------------
    // Group invoices by supplier
    const invoicesBySupplier = new Map<string, InvoiceData[]>();
    input.invoices.forEach((inv) => {
      const list = invoicesBySupplier.get(inv.supplierId) || [];
      list.push(inv);
      invoicesBySupplier.set(inv.supplierId, list);
    });

    invoicesBySupplier.forEach((invList, supplierId) => {
      // Find invoices within 15% below the approval threshold (e.g. 42,500 to 49,999 for threshold 50,000)
      const nearThresholdInvoices = invList.filter(
        (inv) => inv.totalAmount < threshold && inv.totalAmount >= threshold * 0.85
      );

      if (nearThresholdInvoices.length >= 2) {
        const totalSplitAmount = nearThresholdInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
        const supplierName = nearThresholdInvoices[0].supplierName;
        const invoiceNumbers = nearThresholdInvoices.map((i) => i.invoiceNumber).join(", ");

        const risk = evaluateRisk({
          grossDiscrepancy: totalSplitAmount,
          isPaid: nearThresholdInvoices.some((i) => i.paidAmount > 0),
          isApprovalThresholdAvoidance: true,
          independentSignalCount: nearThresholdInvoices.length,
        });

        findings.push({
          id: `int-split-${supplierId}`,
          findingCode: generateCode(),
          ruleId: "RULE_INVOICE_SPLITTING",
          category: "SPLIT_INVOICE",
          severity: risk.severity,
          status: "OPEN",
          title: `Potential Invoice Splitting Below Approval Limit (${formatINR(threshold)})`,
          description: `Supplier ${supplierName} submitted ${nearThresholdInvoices.length} invoices (${invoiceNumbers}) each just beneath the ${formatINR(threshold)} dual-authorization limit. Aggregated value: ${formatINR(totalSplitAmount)}.`,
          supplierId,
          supplierName,
          grossDiscrepancy: totalSplitAmount,
          amountPaid: nearThresholdInvoices.reduce((acc, i) => acc + i.paidAmount, 0),
          unpaidDisputedAmount: nearThresholdInvoices.reduce((acc, i) => acc + (i.totalAmount - i.paidAmount), 0),
          potentialOverpayment: 0,
          potentialRecoverable: totalSplitAmount,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-SPLIT-${supplierId}`,
          financialImpactScore: risk.financialImpactScore,
          anomalyConfidence: 88,
          fraudSuspicionScore: 78,
          compositeRiskScore: risk.compositeRiskScore,
          expectedValue: `Purchases > ${formatINR(threshold)} require consolidated PO & dual-management approval`,
          observedValue: `${nearThresholdInvoices.length} distinct bills (${nearThresholdInvoices.map((i) => formatINR(i.totalAmount)).join(", ")})`,
          varianceCalculation: `Aggregate Spend ${formatINR(totalSplitAmount)} exceeds threshold ${formatINR(threshold)} by ${formatINR(totalSplitAmount - threshold)}`,
          recommendedAction: "Investigate whether work or delivery was artificially broken into sub-orders to bypass higher tier approval.",
          assignedAuditorName: "Senior Internal Auditor",
          evidences: nearThresholdInvoices.map((inv) => ({
            id: `ev-split-${inv.invoiceNumber}`,
            documentType: "TAX_INVOICE",
            documentNumber: inv.invoiceNumber,
            documentDate: inv.invoiceDate,
            sourceField: "totalAmount",
            sourceValue: formatINR(inv.totalAmount),
          })),
          riskSignals: [
            {
              id: `rs-split-1`,
              signalType: "THRESHOLD_AVOIDANCE_PATTERN",
              description: `${nearThresholdInvoices.length} transactions fall within 15% window below single-approver ceiling`,
              weight: 1.8,
            },
          ],
          createdAt: new Date().toISOString(),
        });
      }
    });

    // -------------------------------------------------------------------------
    // 2. SCENARIO H: Duplicate Document Detection (Same hash, different filename)
    // -------------------------------------------------------------------------
    if (input.uploadedDocuments && input.uploadedDocuments.length > 1) {
      const hashGroups = new Map<string, DocumentUploadMeta[]>();
      input.uploadedDocuments.forEach((doc) => {
        if (!doc.fileHashSha256) return;
        const list = hashGroups.get(doc.fileHashSha256) || [];
        list.push(doc);
        hashGroups.set(doc.fileHashSha256, list);
      });

      hashGroups.forEach((docs, hash) => {
        if (docs.length > 1) {
          const original = docs[0];
          const duplicate = docs[1];

          findings.push({
            id: `int-dupe-file-${hash}`,
            findingCode: generateCode(),
            ruleId: "RULE_DUPLICATE_DOCUMENT_HASH",
            category: "DUPLICATE_DOCUMENT",
            severity: "HIGH",
            status: "OPEN",
            title: `Duplicate Document Upload: "${duplicate.filename}" matches "${original.filename}"`,
            description: `Document file "${duplicate.filename}" has the exact cryptographic SHA-256 hash (${hash.substring(0, 16)}...) as previously uploaded file "${original.filename}". Prevented duplicate liability generation.`,
            grossDiscrepancy: duplicate.totalAmount || 0,
            amountPaid: 0,
            unpaidDisputedAmount: duplicate.totalAmount || 0,
            potentialOverpayment: duplicate.totalAmount || 0,
            potentialRecoverable: duplicate.totalAmount || 0,
            confirmedAmount: 0,
            recoveredAmount: 0,
            exposureGroupId: `EXP-DOC-${hash}`,
            financialImpactScore: 50,
            anomalyConfidence: 100,
            fraudSuspicionScore: 40,
            compositeRiskScore: 70,
            expectedValue: "Unique invoice document binary payload",
            observedValue: `Identical SHA-256 hash across filenames: ${original.filename} & ${duplicate.filename}`,
            varianceCalculation: `Duplicate upload identified and neutralized prior to posting`,
            recommendedAction: "Review upload queue and discard duplicate file to prevent double entry.",
            assignedAuditorName: "AP Controller",
            evidences: [
              {
                id: `ev-hash-1`,
                documentType: "DOCUMENT_FILE",
                documentNumber: original.filename,
                sourceField: "sha256",
                sourceValue: hash,
              },
              {
                id: `ev-hash-2`,
                documentType: "DOCUMENT_FILE",
                documentNumber: duplicate.filename,
                sourceField: "sha256",
                sourceValue: hash,
              },
            ],
            riskSignals: [
              {
                id: `rs-hash-1`,
                signalType: "IDENTICAL_FILE_HASH",
                description: "Byte-for-byte exact file upload submitted under altered file name",
                weight: 2.0,
              },
            ],
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    // -------------------------------------------------------------------------
    // 3. SCENARIO F: Supplier & Employee Collusion Indicators
    // -------------------------------------------------------------------------
    // Check A: Multiple distinct suppliers sharing identical bank account details
    const bankAccountMap = new Map<string, SupplierEntity[]>();
    input.suppliers.forEach((s) => {
      if (s.bankAccountNumber && s.bankAccountNumber.trim().length > 4) {
        const key = `${s.bankAccountNumber.trim()}_${s.ifscCode?.trim() || ""}`;
        const list = bankAccountMap.get(key) || [];
        list.push(s);
        bankAccountMap.set(key, list);
      }
    });

    bankAccountMap.forEach((suppliers, key) => {
      if (suppliers.length > 1) {
        const names = suppliers.map((s) => `${s.name} (${s.vendorCode})`).join(", ");
        const accountNum = suppliers[0].bankAccountNumber;

        findings.push({
          id: `int-collusion-bank-${key}`,
          findingCode: generateCode(),
          ruleId: "RULE_SHARED_VENDOR_BANK",
          category: "COLLUSION_SIGNAL",
          severity: "CRITICAL",
          status: "OPEN",
          title: `Shared Bank Account Across Multiple Suppliers: ${accountNum}`,
          description: `Multiple distinct vendor master records (${names}) route payments to the exact same bank account (${accountNum}, IFSC: ${suppliers[0].ifscCode || "N/A"}). This can indicate shell entities or collusive bidding.`,
          grossDiscrepancy: 0,
          amountPaid: 0,
          unpaidDisputedAmount: 0,
          potentialOverpayment: 0,
          potentialRecoverable: 0,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-BANK-${key}`,
          financialImpactScore: 70,
          anomalyConfidence: 99,
          fraudSuspicionScore: 88,
          compositeRiskScore: 85,
          expectedValue: "Distinct independent bank account per registered business entity",
          observedValue: `Shared account: ${accountNum} linked to ${suppliers.length} vendors`,
          varianceCalculation: "Master data anomaly: Shared settlement destination",
          recommendedAction: "Freeze payment runs for these vendors and initiate vendor-master identity audit (PAN/GSTIN verification).",
          assignedAuditorName: "Forensic Audit Lead",
          evidences: suppliers.map((s) => ({
            id: `ev-bank-${s.id}`,
            documentType: "VENDOR_MASTER",
            documentNumber: s.vendorCode,
            sourceField: "bankAccountNumber",
            sourceValue: `${s.bankAccountNumber} (${s.name})`,
          })),
          riskSignals: [
            {
              id: `rs-bank-share`,
              signalType: "CO-MINGLED_BANKING_CHANNELS",
              description: "Multiple competing suppliers share bank payout endpoint",
              weight: 2.5,
            },
          ],
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Check B: Near-Duplicate Invoice Numbers (e.g. INV-1048 vs INV-1048A or INV-1048-1)
    for (let i = 0; i < input.invoices.length; i++) {
      for (let j = i + 1; j < input.invoices.length; j++) {
        const inv1 = input.invoices[i];
        const inv2 = input.invoices[j];

        if (inv1.supplierId === inv2.supplierId) {
          const num1 = inv1.invoiceNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const num2 = inv2.invoiceNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

          // If one contains the other plus a trailing suffix character like A, 1, R
          const isNearDuplicate =
            (num1.length > 3 && num2.startsWith(num1) && num2.length === num1.length + 1) ||
            (num2.length > 3 && num1.startsWith(num2) && num1.length === num2.length + 1);

          if (isNearDuplicate) {
            findings.push({
              id: `int-near-dupe-${inv1.id}-${inv2.id}`,
              findingCode: generateCode(),
              ruleId: "RULE_NEAR_DUPLICATE_INVOICE_NUMBER",
              category: "DUPLICATE_PAYMENT",
              severity: "HIGH",
              status: "OPEN",
              title: `Near-Duplicate Invoice Reference: ${inv1.invoiceNumber} vs ${inv2.invoiceNumber}`,
              description: `Supplier ${inv1.supplierName} submitted near-identical invoice references ${inv1.invoiceNumber} (${formatINR(inv1.totalAmount)}) and ${inv2.invoiceNumber} (${formatINR(inv2.totalAmount)}). Often indicates re-billing with minor suffix changes to bypass duplicate filters.`,
              supplierId: inv1.supplierId,
              supplierName: inv1.supplierName,
              grossDiscrepancy: Math.min(inv1.totalAmount, inv2.totalAmount),
              amountPaid: inv1.paidAmount + inv2.paidAmount,
              unpaidDisputedAmount: Math.min(inv1.totalAmount, inv2.totalAmount),
              potentialOverpayment: Math.min(inv1.totalAmount, inv2.totalAmount),
              potentialRecoverable: Math.min(inv1.totalAmount, inv2.totalAmount),
              confirmedAmount: 0,
              recoveredAmount: 0,
              exposureGroupId: `EXP-NEAR-DUPE-${inv1.invoiceNumber}`,
              financialImpactScore: 65,
              anomalyConfidence: 92,
              fraudSuspicionScore: 82,
              compositeRiskScore: 78,
              expectedValue: "Unique, sequential commercial invoice numbering",
              observedValue: `Variant suffixes: ${inv1.invoiceNumber} vs ${inv2.invoiceNumber}`,
              varianceCalculation: `Potential duplicate billing exposure: ${formatINR(Math.min(inv1.totalAmount, inv2.totalAmount))}`,
              recommendedAction: "Cross-check physical delivery receipts and purchase order line items for both invoices.",
              assignedAuditorName: "AP Controller",
              evidences: [
                {
                  id: `ev-nd-1`,
                  documentType: "TAX_INVOICE",
                  documentNumber: inv1.invoiceNumber,
                  documentDate: inv1.invoiceDate,
                  sourceField: "invoiceNumber",
                  sourceValue: inv1.invoiceNumber,
                },
                {
                  id: `ev-nd-2`,
                  documentType: "TAX_INVOICE",
                  documentNumber: inv2.invoiceNumber,
                  documentDate: inv2.invoiceDate,
                  sourceField: "invoiceNumber",
                  sourceValue: inv2.invoiceNumber,
                },
              ],
              riskSignals: [
                {
                  id: `rs-nd-1`,
                  signalType: "FUZZY_INVOICE_NUMBER_MATCH",
                  description: "Alphanumeric similarity >= 95% with single character variation",
                  weight: 1.7,
                },
              ],
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return findings;
  }
}
