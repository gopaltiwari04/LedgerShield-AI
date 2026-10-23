import { formatINR, toPaise, fromPaise, paiseAdd, paiseSubtract } from "../currency";
import { evaluateRisk } from "../risk/scoring";
import {
  FindingItem,
  ReconciliationResult,
  TolerancesConfig,
  DEFAULT_TOLERANCES,
} from "../types";

export interface POData {
  id: string;
  poNumber: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  vendorCode: string;
  status: string; // APPROVED, AMENDED, CANCELLED
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lines: Array<{
    id: string;
    itemDescription: string;
    sku?: string;
    orderedQuantity: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }>;
  amendments?: Array<{
    amendmentNumber: number;
    amendmentDate: string;
    reason: string;
    previousAmount: number;
    newAmount: number;
    approvedBy?: string;
  }>;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  vendorCode: string;
  status: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  paidAmount: number;
  ocrConfidence?: number;
  fileReference?: string;
  lines: Array<{
    id: string;
    itemDescription: string;
    billedQuantity: number;
    unitPrice: number;
    taxRate: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    lineTotal: number;
  }>;
}

export interface GRNData {
  id: string;
  grnNumber: string;
  grnDate: string;
  poNumber?: string;
  invoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  receivedBy?: string;
  lines: Array<{
    id: string;
    itemDescription: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
  }>;
}

export interface PaymentData {
  id: string;
  paymentReference: string;
  paymentDate: string;
  amount: number;
  supplierId: string;
  supplierName: string;
  allocatedInvoiceNumbers: string[];
  beneficiaryAccount?: string;
}

export interface CreditNoteData {
  id: string;
  creditNoteNumber: string;
  creditDate: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  amount: number;
  reason?: string;
  isApplied: boolean;
  appliedToInvoiceNumber?: string;
}

export interface SupplierStatementEntryData {
  id: string;
  supplierId: string;
  supplierName: string;
  statementDate: string;
  referenceNumber: string;
  documentType: "INVOICE" | "PAYMENT" | "CREDIT_NOTE";
  debitAmount: number;
  creditAmount: number;
}

export interface ReconciliationDataset {
  purchaseOrders: POData[];
  invoices: InvoiceData[];
  goodsReceipts: GRNData[];
  payments: PaymentData[];
  creditNotes: CreditNoteData[];
  statementEntries?: SupplierStatementEntryData[];
}

export class ReconciliationEngine {
  private tolerances: TolerancesConfig;

  constructor(tolerances: TolerancesConfig = DEFAULT_TOLERANCES) {
    this.tolerances = tolerances;
  }

  /**
   * Run full reconciliation across all documents
   */
  public reconcile(dataset: ReconciliationDataset): ReconciliationResult {
    const findings: FindingItem[] = [];
    const runId = `RUN-${Date.now().toString(36).toUpperCase()}`;
    const runDate = new Date().toISOString();

    const poMap = new Map<string, POData>();
    dataset.purchaseOrders.forEach((po) => poMap.set(po.poNumber, po));

    const invoiceMap = new Map<string, InvoiceData>();
    dataset.invoices.forEach((inv) => invoiceMap.set(inv.invoiceNumber, inv));

    // Map GRNs by PO number (supporting multiple partial deliveries)
    const grnsByPo = new Map<string, GRNData[]>();
    dataset.goodsReceipts.forEach((grn) => {
      if (grn.poNumber) {
        const list = grnsByPo.get(grn.poNumber) || [];
        list.push(grn);
        grnsByPo.set(grn.poNumber, list);
      }
    });

    // Map Payments by Invoice Number
    const paymentsByInvoice = new Map<string, PaymentData[]>();
    dataset.payments.forEach((pmt) => {
      pmt.allocatedInvoiceNumbers.forEach((invNum) => {
        const list = paymentsByInvoice.get(invNum) || [];
        list.push(pmt);
        paymentsByInvoice.set(invNum, list);
      });
    });

    let findingCounter = 1;
    const generateCode = () => `FL-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, "0")}`;

    // -------------------------------------------------------------------------
    // CHECK A: PO vs Invoice (Price Overcharge, Quantity Overbill, Amendments)
    // -------------------------------------------------------------------------
    for (const invoice of dataset.invoices) {
      if (!invoice.poNumber) continue;
      const po = poMap.get(invoice.poNumber);

      if (!po) {
        // Unmatched PO reference
        const risk = evaluateRisk({
          grossDiscrepancy: invoice.totalAmount,
          isPaid: invoice.paidAmount > 0,
          extractionConfidence: invoice.ocrConfidence,
          independentSignalCount: 1,
        });

        findings.push({
          id: `f-${findings.length + 1}`,
          findingCode: generateCode(),
          ruleId: "RULE_UNMATCHED_PO",
          category: "PRICE_VARIANCE",
          severity: risk.severity,
          status: "OPEN",
          title: `Unmatched Purchase Order Reference: ${invoice.poNumber}`,
          description: `Invoice ${invoice.invoiceNumber} references PO ${invoice.poNumber}, but no approved PO exists in internal records.`,
          supplierId: invoice.supplierId,
          supplierName: invoice.supplierName,
          vendorCode: invoice.vendorCode,
          invoiceNumber: invoice.invoiceNumber,
          poNumber: invoice.poNumber,
          grossDiscrepancy: invoice.totalAmount,
          amountPaid: invoice.paidAmount,
          unpaidDisputedAmount: invoice.totalAmount - invoice.paidAmount,
          potentialOverpayment: invoice.paidAmount,
          potentialRecoverable: invoice.paidAmount > 0 ? invoice.paidAmount : invoice.totalAmount,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-INV-${invoice.invoiceNumber}`,
          financialImpactScore: risk.financialImpactScore,
          anomalyConfidence: risk.anomalyConfidence,
          fraudSuspicionScore: risk.fraudSuspicionScore,
          compositeRiskScore: risk.compositeRiskScore,
          expectedValue: `Valid PO reference in system`,
          observedValue: `PO ${invoice.poNumber} not found`,
          varianceCalculation: `Full invoice value at risk: ${formatINR(invoice.totalAmount)}`,
          recommendedAction: "Hold payment pending verification of procurement authorization and PO issuance.",
          evidences: [
            {
              id: `ev-${Date.now()}-1`,
              documentType: "TAX_INVOICE",
              documentNumber: invoice.invoiceNumber,
              sourceField: "poNumber",
              sourceValue: invoice.poNumber,
              fileReference: invoice.fileReference,
            },
          ],
          riskSignals: [
            {
              id: `rs-1`,
              signalType: "MISSING_SOURCE_PO",
              description: "No approved procurement authorization found in database",
              weight: 1.5,
            },
          ],
          createdAt: new Date().toISOString(),
        });
        continue;
      }

      // Check if PO is cancelled
      if (po.status === "CANCELLED") {
        const risk = evaluateRisk({
          grossDiscrepancy: invoice.totalAmount,
          isPaid: invoice.paidAmount > 0,
          independentSignalCount: 1,
        });
        findings.push({
          id: `f-${findings.length + 1}`,
          findingCode: generateCode(),
          ruleId: "RULE_CANCELLED_PO",
          category: "EXPIRED_PO",
          severity: "CRITICAL",
          status: "OPEN",
          title: `Billed Against Cancelled Purchase Order ${po.poNumber}`,
          description: `Invoice ${invoice.invoiceNumber} was submitted against PO ${po.poNumber} which was cancelled.`,
          supplierId: invoice.supplierId,
          supplierName: invoice.supplierName,
          vendorCode: invoice.vendorCode,
          invoiceNumber: invoice.invoiceNumber,
          poNumber: po.poNumber,
          grossDiscrepancy: invoice.totalAmount,
          amountPaid: invoice.paidAmount,
          unpaidDisputedAmount: invoice.totalAmount - invoice.paidAmount,
          potentialOverpayment: invoice.paidAmount,
          potentialRecoverable: invoice.paidAmount > 0 ? invoice.paidAmount : invoice.totalAmount,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-INV-${invoice.invoiceNumber}`,
          financialImpactScore: risk.financialImpactScore,
          anomalyConfidence: 99,
          fraudSuspicionScore: 75,
          compositeRiskScore: 85,
          expectedValue: `PO Status: APPROVED`,
          observedValue: `PO Status: CANCELLED`,
          varianceCalculation: `Full invoiced amount: ${formatINR(invoice.totalAmount)}`,
          recommendedAction: "Immediately reject invoice. If paid, initiate clawback and review approval trail.",
          evidences: [],
          riskSignals: [],
          createdAt: new Date().toISOString(),
        });
        continue;
      }

      // Check Line-by-Line Price & Quantity
      // Also account for Scenario I: Check if there is an approved amendment overriding PO price!
      for (const invLine of invoice.lines) {
        // Find matching PO line by description / sku
        const poLine = po.lines.find(
          (pl) =>
            pl.itemDescription.toLowerCase() === invLine.itemDescription.toLowerCase() ||
            (pl.sku && invLine.itemDescription.toLowerCase().includes(pl.sku.toLowerCase()))
        );

        if (!poLine) continue;

        // Check if there is a valid approved amendment modifying this PO line price
        let effectivePoUnitPrice = poLine.unitPrice;
        let isAmended = false;
        if (po.amendments && po.amendments.length > 0) {
          // If approved amendment exists, check whether amendment justifies rate
          const approvedAmendment = po.amendments.find((a) => a.approvedBy);
          if (approvedAmendment && poLine.orderedQuantity > 0) {
            const taxFactor = 1 + (poLine.taxRate || 18) / 100;
            const rateDirect = approvedAmendment.newAmount / poLine.orderedQuantity;
            const ratePreTax = (approvedAmendment.newAmount / taxFactor) / poLine.orderedQuantity;
            if (
              Math.abs(rateDirect - invLine.unitPrice) <= 0.05 ||
              Math.abs(ratePreTax - invLine.unitPrice) <= 0.05
            ) {
              effectivePoUnitPrice = invLine.unitPrice;
              isAmended = true;
            }
          }
        }

        // Scenario A check: Invoiced Unit Price > Approved PO Unit Price (Beyond tolerance)
        const priceDiff = invLine.unitPrice - effectivePoUnitPrice;
        const priceToleranceLimit = (effectivePoUnitPrice * this.tolerances.priceTolerancePct) / 100;

        if (priceDiff > priceToleranceLimit && !isAmended) {
          const grossOverchargeBeforeTax = priceDiff * invLine.billedQuantity;
          const taxMultiplier = 1 + (invLine.taxRate || 18) / 100;
          const grossOverchargeWithTax = Math.round(grossOverchargeBeforeTax * taxMultiplier * 100) / 100;

          const isPaid = invoice.paidAmount >= invoice.totalAmount;
          const risk = evaluateRisk({
            grossDiscrepancy: grossOverchargeWithTax,
            isPaid,
            extractionConfidence: invoice.ocrConfidence,
            independentSignalCount: 1,
          });

          findings.push({
            id: `f-${findings.length + 1}`,
            findingCode: generateCode(),
            ruleId: "RULE_PRICE_OVERCHARGE",
            category: "PRICE_VARIANCE",
            severity: risk.severity,
            status: "OPEN",
            title: `Unit Price Overcharge: ${invLine.itemDescription}`,
            description: `Supplier invoiced ₹${invLine.unitPrice.toFixed(2)}/unit, whereas approved PO ${po.poNumber} specifies ₹${effectivePoUnitPrice.toFixed(2)}/unit. Variance of ₹${priceDiff.toFixed(2)} per unit across ${invLine.billedQuantity} units.`,
            supplierId: invoice.supplierId,
            supplierName: invoice.supplierName,
            vendorCode: invoice.vendorCode,
            poNumber: po.poNumber,
            invoiceNumber: invoice.invoiceNumber,
            grossDiscrepancy: grossOverchargeWithTax,
            amountPaid: isPaid ? grossOverchargeWithTax : 0,
            unpaidDisputedAmount: isPaid ? 0 : grossOverchargeWithTax,
            potentialOverpayment: isPaid ? grossOverchargeWithTax : 0,
            potentialRecoverable: grossOverchargeWithTax,
            confirmedAmount: 0,
            recoveredAmount: 0,
            exposureGroupId: `EXP-PRICE-${invoice.invoiceNumber}-${invLine.id}`,
            financialImpactScore: risk.financialImpactScore,
            anomalyConfidence: risk.anomalyConfidence,
            fraudSuspicionScore: risk.fraudSuspicionScore,
            compositeRiskScore: risk.compositeRiskScore,
            expectedValue: `₹${effectivePoUnitPrice.toFixed(2)} per unit (${po.poNumber})`,
            observedValue: `₹${invLine.unitPrice.toFixed(2)} per unit (${invoice.invoiceNumber})`,
            varianceCalculation: `(${invLine.billedQuantity} units) × (₹${invLine.unitPrice} - ₹${effectivePoUnitPrice}) = ₹${grossOverchargeBeforeTax.toFixed(2)} + GST (${invLine.taxRate}%) = ${formatINR(grossOverchargeWithTax)}`,
            recommendedAction: isPaid
              ? "Issue formal debit note or request supplier credit note for overcharged difference."
              : "Short-pay invoice by deducting ₹" + grossOverchargeWithTax.toFixed(2) + " before releasing payment.",
            assignedAuditorName: "Senior Internal Auditor",
            evidences: [
              {
                id: `ev-po-${po.poNumber}`,
                documentType: "PURCHASE_ORDER",
                documentNumber: po.poNumber,
                documentDate: po.poDate,
                sourceField: "unitPrice",
                sourceValue: `₹${effectivePoUnitPrice.toFixed(2)}`,
              },
              {
                id: `ev-inv-${invoice.invoiceNumber}`,
                documentType: "TAX_INVOICE",
                documentNumber: invoice.invoiceNumber,
                documentDate: invoice.invoiceDate,
                sourceField: "unitPrice",
                sourceValue: `₹${invLine.unitPrice.toFixed(2)}`,
                fileReference: invoice.fileReference,
              },
            ],
            riskSignals: [
              {
                id: `rs-price-1`,
                signalType: "UNAPPROVED_RATE_INCREASE",
                description: `Invoice rate is ${((priceDiff / effectivePoUnitPrice) * 100).toFixed(1)}% higher than contract without PO amendment`,
                weight: 1.2,
              },
            ],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK B: PO vs Goods Received (Under-delivery & Multi-Delivery Reconcile)
    // -------------------------------------------------------------------------
    for (const invoice of dataset.invoices) {
      if (!invoice.poNumber) continue;
      const po = poMap.get(invoice.poNumber);
      if (!po) continue;

      const matchingGrns = grnsByPo.get(po.poNumber) || [];

      for (const invLine of invoice.lines) {
        // Aggregate received quantity across ALL valid GRNs for this PO/Item (Scenario G: Partial deliveries!)
        let totalAcceptedQuantity = 0;
        const grnEvidences: any[] = [];

        matchingGrns.forEach((grn) => {
          const grnLine = grn.lines.find(
            (gl) => gl.itemDescription.toLowerCase() === invLine.itemDescription.toLowerCase()
          );
          if (grnLine) {
            totalAcceptedQuantity += grnLine.acceptedQuantity;
            grnEvidences.push({
              id: `ev-grn-${grn.grnNumber}`,
              documentType: "GOODS_RECEIPT",
              documentNumber: grn.grnNumber,
              documentDate: grn.grnDate,
              sourceField: "acceptedQuantity",
              sourceValue: `${grnLine.acceptedQuantity} units`,
            });
          }
        });

        // Scenario B: Under-delivery (Invoiced Quantity > Total Received Quantity)
        const quantityShortfall = invLine.billedQuantity - totalAcceptedQuantity;

        if (quantityShortfall > 0) {
          // Billed for goods not received!
          const poLine = po.lines.find(
            (pl) => pl.itemDescription.toLowerCase() === invLine.itemDescription.toLowerCase()
          );
          const approvedRate = poLine ? poLine.unitPrice : invLine.unitPrice;
          const shortfallBeforeTax = quantityShortfall * approvedRate;
          const taxMultiplier = 1 + (invLine.taxRate || 18) / 100;
          const shortfallWithTax = Math.round(shortfallBeforeTax * taxMultiplier * 100) / 100;

          const isPaid = invoice.paidAmount >= invoice.totalAmount;
          const risk = evaluateRisk({
            grossDiscrepancy: shortfallWithTax,
            isPaid,
            extractionConfidence: invoice.ocrConfidence,
            independentSignalCount: matchingGrns.length > 0 ? 1 : 2,
          });

          findings.push({
            id: `f-${findings.length + 1}`,
            findingCode: generateCode(),
            ruleId: "RULE_UNDER_DELIVERY",
            category: "QUANTITY_SHORTAGE",
            severity: risk.severity,
            status: "OPEN",
            title: `Under-Delivery Shortfall: ${invLine.itemDescription}`,
            description: `Supplier billed for ${invLine.billedQuantity} units, but warehouse records show only ${totalAcceptedQuantity} units accepted across ${matchingGrns.length} GRNs (shortfall of ${quantityShortfall} units).`,
            supplierId: invoice.supplierId,
            supplierName: invoice.supplierName,
            vendorCode: invoice.vendorCode,
            poNumber: po.poNumber,
            invoiceNumber: invoice.invoiceNumber,
            grossDiscrepancy: shortfallWithTax,
            amountPaid: isPaid ? shortfallWithTax : 0,
            unpaidDisputedAmount: isPaid ? 0 : shortfallWithTax,
            potentialOverpayment: isPaid ? shortfallWithTax : 0,
            potentialRecoverable: shortfallWithTax,
            confirmedAmount: 0,
            recoveredAmount: 0,
            exposureGroupId: `EXP-QTY-${invoice.invoiceNumber}-${invLine.id}`,
            financialImpactScore: risk.financialImpactScore,
            anomalyConfidence: risk.anomalyConfidence,
            fraudSuspicionScore: risk.fraudSuspicionScore,
            compositeRiskScore: risk.compositeRiskScore,
            expectedValue: `${invLine.billedQuantity} units received (matching invoice)`,
            observedValue: `${totalAcceptedQuantity} units physically accepted in GRN`,
            varianceCalculation: `(${quantityShortfall} units shortfall) × ₹${approvedRate}/unit = ₹${shortfallBeforeTax.toFixed(2)} + GST (${invLine.taxRate}%) = ${formatINR(shortfallWithTax)}`,
            recommendedAction: "Request proof of delivery (signed LR / transport challan) or debit note for unreceived quantity.",
            assignedAuditorName: "Lead Financial Auditor",
            evidences: [
              {
                id: `ev-inv-qty-${invoice.invoiceNumber}`,
                documentType: "TAX_INVOICE",
                documentNumber: invoice.invoiceNumber,
                documentDate: invoice.invoiceDate,
                sourceField: "billedQuantity",
                sourceValue: `${invLine.billedQuantity} units`,
              },
              ...grnEvidences,
            ],
            riskSignals: [
              {
                id: `rs-qty-1`,
                signalType: "PHYSICAL_DELIVERY_SHORTFALL",
                description: `Discrepancy of ${quantityShortfall} units between billing and warehouse acceptance logs`,
                weight: 1.4,
              },
            ],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK C: Invoice vs Payments (Scenario C: Duplicate Payments & Overpayment)
    // -------------------------------------------------------------------------
    for (const invoice of dataset.invoices) {
      const payments = paymentsByInvoice.get(invoice.invoiceNumber) || [];
      if (payments.length > 1) {
        // Multiple payments linked to same invoice
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const overpaymentAmount = totalPaid - invoice.totalAmount;

        if (overpaymentAmount > 0.01) {
          const risk = evaluateRisk({
            grossDiscrepancy: overpaymentAmount,
            isPaid: true,
            independentSignalCount: 2,
          });

          findings.push({
            id: `f-${findings.length + 1}`,
            findingCode: generateCode(),
            ruleId: "RULE_DUPLICATE_PAYMENT",
            category: "DUPLICATE_PAYMENT",
            severity: "CRITICAL",
            status: "OPEN",
            title: `Duplicate Payment Detected: ${invoice.invoiceNumber}`,
            description: `Invoice ${invoice.invoiceNumber} of ${formatINR(invoice.totalAmount)} has been paid ${payments.length} times (Total disbursed: ${formatINR(totalPaid)}), resulting in an overpayment of ${formatINR(overpaymentAmount)}.`,
            supplierId: invoice.supplierId,
            supplierName: invoice.supplierName,
            vendorCode: invoice.vendorCode,
            invoiceNumber: invoice.invoiceNumber,
            grossDiscrepancy: overpaymentAmount,
            amountPaid: totalPaid,
            unpaidDisputedAmount: 0,
            potentialOverpayment: overpaymentAmount,
            potentialRecoverable: overpaymentAmount,
            confirmedAmount: 0,
            recoveredAmount: 0,
            exposureGroupId: `EXP-DUPE-${invoice.invoiceNumber}`,
            financialImpactScore: risk.financialImpactScore,
            anomalyConfidence: 98,
            fraudSuspicionScore: 65,
            compositeRiskScore: 90,
            expectedValue: `Single payment of ${formatINR(invoice.totalAmount)}`,
            observedValue: `${payments.length} payments totalling ${formatINR(totalPaid)} (${payments.map((p) => p.paymentReference).join(", ")})`,
            varianceCalculation: `Total Disbursed (${formatINR(totalPaid)}) - Invoice Value (${formatINR(invoice.totalAmount)}) = ${formatINR(overpaymentAmount)} Overpayment`,
            recommendedAction: "Immediately contact supplier for bank refund or apply set-off against next pending remittance.",
            assignedAuditorName: "AP Controller",
            evidences: payments.map((p, idx) => ({
              id: `ev-pmt-${idx}`,
              documentType: "BANK_PAYMENT_ADVICE",
              documentNumber: p.paymentReference,
              documentDate: p.paymentDate,
              sourceField: "amount",
              sourceValue: formatINR(p.amount),
            })),
            riskSignals: [
              {
                id: `rs-pmt-dupe`,
                signalType: "MULTIPLE_DISBURSEMENTS_SAME_INVOICE",
                description: `Invoice reference ${invoice.invoiceNumber} matched across multiple distinct settlement UTRs`,
                weight: 2.0,
              },
            ],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK D: Missing Supplier Credits (Scenario D: Unapplied Credit Notes)
    // -------------------------------------------------------------------------
    for (const creditNote of dataset.creditNotes) {
      if (!creditNote.isApplied) {
        const risk = evaluateRisk({
          grossDiscrepancy: creditNote.amount,
          isPaid: false,
          independentSignalCount: 1,
        });

        findings.push({
          id: `f-${findings.length + 1}`,
          findingCode: generateCode(),
          ruleId: "RULE_UNAPPLIED_CREDIT",
          category: "UNAPPLIED_CREDIT",
          severity: risk.severity,
          status: "OPEN",
          title: `Unapplied Supplier Credit Note: ${creditNote.creditNoteNumber}`,
          description: `Supplier ${creditNote.supplierName} issued Credit Note ${creditNote.creditNoteNumber} for ${formatINR(creditNote.amount)} (${creditNote.reason || "Price difference / returns"}), but it has not been applied to accounts payable.`,
          supplierId: creditNote.supplierId,
          supplierName: creditNote.supplierName,
          creditNoteNumber: creditNote.creditNoteNumber,
          grossDiscrepancy: creditNote.amount,
          amountPaid: 0,
          unpaidDisputedAmount: 0,
          potentialOverpayment: 0,
          potentialRecoverable: creditNote.amount,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-CN-${creditNote.creditNoteNumber}`,
          financialImpactScore: risk.financialImpactScore,
          anomalyConfidence: 96,
          fraudSuspicionScore: 30,
          compositeRiskScore: 60,
          expectedValue: `Credit Note applied to open balance / AP subledger`,
          observedValue: `Credit Note unapplied / omitted from internal settlement`,
          varianceCalculation: `Recoverable credit note value: ${formatINR(creditNote.amount)}`,
          recommendedAction: "Apply credit note against outstanding supplier balance before next payment disbursement.",
          assignedAuditorName: "AP Controller",
          evidences: [
            {
              id: `ev-cn-${creditNote.creditNoteNumber}`,
              documentType: "CREDIT_NOTE",
              documentNumber: creditNote.creditNoteNumber,
              documentDate: creditNote.creditDate,
              sourceField: "amount",
              sourceValue: formatINR(creditNote.amount),
            },
          ],
          riskSignals: [
            {
              id: `rs-cn-1`,
              signalType: "UNRECORDED_SUPPLIER_CREDIT",
              description: "Valid credit note from vendor statement not utilized in AP run",
              weight: 1.2,
            },
          ],
          createdAt: new Date().toISOString(),
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK E: Tax and Arithmetic Validation
    // -------------------------------------------------------------------------
    for (const invoice of dataset.invoices) {
      // Sum line items
      const lineItemsSum = invoice.lines.reduce((acc, l) => acc + l.lineTotal, 0);
      const diff = Math.abs(invoice.totalAmount - lineItemsSum);

      if (diff > this.tolerances.taxRoundingToleranceINR) {
        findings.push({
          id: `f-${findings.length + 1}`,
          findingCode: generateCode(),
          ruleId: "RULE_ARITHMETIC_MISMATCH",
          category: "TAX_MISMATCH",
          severity: "MEDIUM",
          status: "OPEN",
          title: `Arithmetic Mismatch on Invoice ${invoice.invoiceNumber}`,
          description: `Sum of line items (${formatINR(lineItemsSum)}) does not match stated invoice total (${formatINR(invoice.totalAmount)}). Discrepancy of ${formatINR(diff)}.`,
          supplierId: invoice.supplierId,
          supplierName: invoice.supplierName,
          invoiceNumber: invoice.invoiceNumber,
          grossDiscrepancy: diff,
          amountPaid: invoice.paidAmount,
          unpaidDisputedAmount: diff,
          potentialOverpayment: invoice.paidAmount > lineItemsSum ? invoice.paidAmount - lineItemsSum : 0,
          potentialRecoverable: diff,
          confirmedAmount: 0,
          recoveredAmount: 0,
          exposureGroupId: `EXP-ARITH-${invoice.invoiceNumber}`,
          financialImpactScore: 40,
          anomalyConfidence: 99,
          fraudSuspicionScore: 20,
          compositeRiskScore: 50,
          expectedValue: `Invoice Total: ${formatINR(lineItemsSum)}`,
          observedValue: `Invoice Total: ${formatINR(invoice.totalAmount)}`,
          varianceCalculation: `Stated (${formatINR(invoice.totalAmount)}) - Sum of Lines (${formatINR(lineItemsSum)}) = ${formatINR(diff)}`,
          recommendedAction: "Request corrected invoice from vendor before processing payment.",
          evidences: [],
          riskSignals: [],
          createdAt: new Date().toISOString(),
        });
      }
    }

    // -------------------------------------------------------------------------
    // Scenario J: Deduplication and Exposure Grouping (Prevent Double-Counting)
    // -------------------------------------------------------------------------
    const exposureGroupMap = new Map<string, number>();
    let totalGrossExposurePaise = 0;

    findings.forEach((f) => {
      totalGrossExposurePaise += toPaise(f.grossDiscrepancy);
      const groupId = f.exposureGroupId || f.id;
      // Take the maximum single exposure among linked findings to avoid double-counting
      const currentPaise = exposureGroupMap.get(groupId) || 0;
      const fPaise = toPaise(f.grossDiscrepancy);
      if (fPaise > currentPaise) {
        exposureGroupMap.set(groupId, fPaise);
      }
    });

    let netUniqueExposurePaise = 0;
    exposureGroupMap.forEach((valPaise) => {
      netUniqueExposurePaise += valPaise;
    });

    return {
      runId,
      runDate,
      totalDocumentsProcessed:
        dataset.purchaseOrders.length +
        dataset.invoices.length +
        dataset.goodsReceipts.length +
        dataset.payments.length +
        dataset.creditNotes.length,
      totalInvoicesScanned: dataset.invoices.length,
      matchedCount: dataset.invoices.length - findings.length,
      discrepancyCount: findings.length,
      totalGrossExposureINR: fromPaise(totalGrossExposurePaise),
      netUniqueExposureINR: fromPaise(netUniqueExposurePaise),
      findings,
    };
  }
}
