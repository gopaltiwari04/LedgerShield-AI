import { describe, it } from "node:test";
import assert from "node:assert";
import { ReconciliationEngine } from "../lib/reconciliation/engine";
import { ProcurementIntegrityMonitor } from "../lib/integrity/monitor";
import { generateScenariosDataset } from "../lib/seed/scenarios";

describe("LedgerShield Financial Reconciliation & Integrity Engine", () => {
  const { dataset, suppliers, uploadedDocuments } = generateScenariosDataset();
  const engine = new ReconciliationEngine();
  const monitor = new ProcurementIntegrityMonitor();

  const reconResult = engine.reconcile(dataset);
  const integrityFindings = monitor.analyze({
    invoices: dataset.invoices,
    payments: dataset.payments,
    purchaseOrders: dataset.purchaseOrders,
    suppliers,
    uploadedDocuments,
  });

  const allFindings = [...reconResult.findings, ...integrityFindings];

  it("Scenario A: Accurately identifies price overcharge", () => {
    const priceFinding = allFindings.find((f) => f.ruleId === "RULE_PRICE_OVERCHARGE");
    assert.ok(priceFinding, "Expected RULE_PRICE_OVERCHARGE to be triggered");
    assert.strictEqual(priceFinding.invoiceNumber, "INV-2024-101");
    assert.strictEqual(priceFinding.poNumber, "PO-2024-001");
    // 100 units * (550 - 500) = 5,000 + 18% GST = 5,900
    assert.strictEqual(priceFinding.grossDiscrepancy, 5900.0);
    assert.strictEqual(priceFinding.potentialRecoverable, 5900.0);
  });

  it("Scenario B: Accurately flags under-delivery shortfall", () => {
    const qtyFinding = allFindings.find((f) => f.ruleId === "RULE_UNDER_DELIVERY");
    assert.ok(qtyFinding, "Expected RULE_UNDER_DELIVERY to be triggered");
    assert.strictEqual(qtyFinding.invoiceNumber, "INV-2024-102");
    // 10 units shortfall * 200 = 2,000 + 18% GST = 2,360
    assert.strictEqual(qtyFinding.grossDiscrepancy, 2360.0);
    assert.strictEqual(qtyFinding.potentialRecoverable, 2360.0);
  });

  it("Scenario C: Accurately detects duplicate payments on the same invoice", () => {
    const dupeFinding = allFindings.find((f) => f.ruleId === "RULE_DUPLICATE_PAYMENT");
    assert.ok(dupeFinding, "Expected RULE_DUPLICATE_PAYMENT to be triggered");
    assert.strictEqual(dupeFinding.invoiceNumber, "INV-2024-103");
    assert.strictEqual(dupeFinding.grossDiscrepancy, 50000.0);
    assert.strictEqual(dupeFinding.potentialOverpayment, 50000.0);
  });

  it("Scenario D: Tracks unapplied supplier credit note", () => {
    const creditFinding = allFindings.find((f) => f.ruleId === "RULE_UNAPPLIED_CREDIT");
    assert.ok(creditFinding, "Expected RULE_UNAPPLIED_CREDIT to be triggered");
    assert.strictEqual(creditFinding.creditNoteNumber, "CN-2024-088");
    assert.strictEqual(creditFinding.grossDiscrepancy, 12000.0);
    assert.strictEqual(creditFinding.potentialRecoverable, 12000.0);
  });

  it("Scenario E: Identifies invoice splitting below approval threshold", () => {
    const splitFinding = allFindings.find((f) => f.ruleId === "RULE_INVOICE_SPLITTING");
    assert.ok(splitFinding, "Expected RULE_INVOICE_SPLITTING to be triggered");
    // Three invoices: 48,000 + 49,000 + 47,000 = 144,000
    assert.strictEqual(splitFinding.grossDiscrepancy, 144000.0);
    assert.ok(splitFinding.title.includes("Approval Limit"));
  });

  it("Scenario F: Identifies shared vendor bank accounts (collusion signal)", () => {
    const bankFinding = allFindings.find((f) => f.ruleId === "RULE_SHARED_VENDOR_BANK");
    assert.ok(bankFinding, "Expected RULE_SHARED_VENDOR_BANK to be triggered");
    assert.ok(bankFinding.description.includes("HDFC000123456789"));
  });

  it("Scenario G: Correctly handles legitimate partial deliveries without false alarms", () => {
    // PO-2024-007 has 500 units delivered across GRN-007A (300) and GRN-007B (200)
    const falseShortfallFinding = allFindings.find(
      (f) => f.ruleId === "RULE_UNDER_DELIVERY" && f.poNumber === "PO-2024-007"
    );
    assert.strictEqual(
      falseShortfallFinding,
      undefined,
      "Legitimate partial deliveries must NOT trigger under-delivery error"
    );
  });

  it("Scenario H: Identifies duplicate document upload by cryptographic hash", () => {
    const hashFinding = allFindings.find((f) => f.ruleId === "RULE_DUPLICATE_DOCUMENT_HASH");
    assert.ok(hashFinding, "Expected RULE_DUPLICATE_DOCUMENT_HASH to be triggered");
  });

  it("Scenario I: Honors approved PO amendment and avoids false overcharge alarm", () => {
    // PO-2024-009 was amended from 500 to 600 with approval; INV-2024-109 is at 600
    const falseOverchargeFinding = allFindings.find(
      (f) => f.ruleId === "RULE_PRICE_OVERCHARGE" && f.invoiceNumber === "INV-2024-109"
    );
    assert.strictEqual(
      falseOverchargeFinding,
      undefined,
      "Approved PO amendments must NOT be reported as price overcharges"
    );
  });

  it("Scenario J: Prevents double-counting across overlapping financial exposure", () => {
    assert.ok(
      reconResult.netUniqueExposureINR <= reconResult.totalGrossExposureINR,
      "Net unique exposure must never exceed gross exposure"
    );
    // Net unique exposure = Scenario A (5,900) + Scenario B (2,360) + Scenario C (50,000) + Scenario D (12,000) = 70,260.00 INR
    assert.strictEqual(reconResult.netUniqueExposureINR, 70260.0);
  });
});
