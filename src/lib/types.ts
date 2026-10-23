export type UserRole =
  | "ADMIN"
  | "FINANCE_MANAGER"
  | "AP_OPERATOR"
  | "PROCUREMENT_MANAGER"
  | "WAREHOUSE_OPERATOR"
  | "INTERNAL_AUDITOR"
  | "READ_ONLY_EXEC";

export type FindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FindingStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "CONFIRMED"
  | "DISMISSED"
  | "RECOVERED"
  | "RESOLVED";

export type DiscrepancyCategory =
  | "PRICE_VARIANCE"
  | "QUANTITY_SHORTAGE"
  | "DUPLICATE_PAYMENT"
  | "UNAPPLIED_CREDIT"
  | "SPLIT_INVOICE"
  | "TAX_MISMATCH"
  | "COLLUSION_SIGNAL"
  | "EXPIRED_PO"
  | "DUPLICATE_DOCUMENT";

export interface TolerancesConfig {
  priceTolerancePct: number;    // e.g. 0.5%
  quantityTolerancePct: number; // e.g. 0.0%
  taxRoundingToleranceINR: number; // e.g. 2.00 INR
  approvalLimitThresholdINR: number; // e.g. 50,000 INR
  duplicateWindowDays: number; // e.g. 60 days
}

export const DEFAULT_TOLERANCES: TolerancesConfig = {
  priceTolerancePct: 0.5,
  quantityTolerancePct: 0.0,
  taxRoundingToleranceINR: 2.0,
  approvalLimitThresholdINR: 50000.0,
  duplicateWindowDays: 60,
};

export interface ReconciliationResult {
  runId: string;
  runDate: string;
  totalDocumentsProcessed: number;
  totalInvoicesScanned: number;
  matchedCount: number;
  discrepancyCount: number;
  totalGrossExposureINR: number;
  netUniqueExposureINR: number; // After double-count deduplication
  findings: FindingItem[];
}

export interface FindingItem {
  id: string;
  findingCode: string;
  ruleId: string;
  category: DiscrepancyCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  title: string;
  description: string;
  supplierId?: string;
  supplierName?: string;
  vendorCode?: string;
  poNumber?: string;
  invoiceNumber?: string;
  grnNumber?: string;
  paymentRef?: string;
  creditNoteNumber?: string;

  // Exact deterministic calculations
  grossDiscrepancy: number;
  amountPaid: number;
  unpaidDisputedAmount: number;
  potentialOverpayment: number;
  potentialRecoverable: number;
  confirmedAmount: number;
  recoveredAmount: number;
  exposureGroupId?: string; // Group ID for multi-finding single financial exposure

  // Explainable Risk Metrics
  financialImpactScore: number; // 0-100
  anomalyConfidence: number;    // 0-100
  fraudSuspicionScore: number;  // 0-100
  compositeRiskScore: number;   // 0-100

  // Evidence & Calculation trail
  expectedValue: string;
  observedValue: string;
  varianceCalculation: string;
  recommendedAction: string;
  assignedAuditorName?: string;
  evidences: FindingEvidenceItem[];
  riskSignals: RiskSignalItem[];
  createdAt: string;
}

export interface FindingEvidenceItem {
  id: string;
  documentType: string;
  documentNumber: string;
  documentDate?: string;
  sourceField?: string;
  sourceValue?: string;
  pageNumber?: number;
  fileReference?: string;
  isContradicting?: boolean;
}

export interface RiskSignalItem {
  id: string;
  signalType: string;
  description: string;
  weight: number;
}
