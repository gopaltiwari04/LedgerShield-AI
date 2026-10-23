import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  toPaise,
  fromPaise,
  paiseAdd,
  paiseSubtract,
  paiseMultiply,
  formatINR,
  calculateGST,
  validateGSTIN,
} from "../lib/currency";

describe("LedgerShield Financial Arithmetic & Indian Tax Engine", () => {
  test("Calculates exact sums without IEEE-754 binary floating-point drift", () => {
    // Standard JS float error: 0.1 + 0.2 === 0.30000000000000004
    const floatSum = 0.1 + 0.2;
    assert.notEqual(floatSum, 0.3); // Proves float drift exists in standard JS

    // Our paiseAdd handles this deterministically
    const exactSum = paiseAdd(0.1, 0.2);
    assert.equal(exactSum, 0.3);

    // Multi-item addition: 12450.55 + 3420.45 + 1000.00
    const total = paiseAdd(12450.55, 3420.45, 1000.0);
    assert.equal(total, 16871.0);
    assert.equal(toPaise(total), 1687100);
  });

  test("Calculates exact subtractions and variance exposures", () => {
    const billedRate = 1250.75;
    const poRate = 1000.25;
    const rateDiff = paiseSubtract(billedRate, poRate);
    assert.equal(rateDiff, 250.5);

    const totalExposure = paiseMultiply(rateDiff, 100);
    assert.equal(totalExposure, 25050.0);
  });

  test("Formats Indian Rupee values with correct Lakh and Crore groupings", () => {
    assert.equal(formatINR(0), "₹0.00");
    assert.equal(formatINR(1250), "₹1,250.00");
    assert.equal(formatINR(125000), "₹1,25,000.00"); // 1.25 Lakhs
    assert.equal(formatINR(15000000), "₹1,50,00,000.00"); // 1.5 Crores
    assert.equal(formatINR(-54000.5), "-₹54,000.50");
  });

  test("Accurately computes Indian GST (Intra-state CGST/SGST vs Inter-state IGST)", () => {
    // Intra-state (Maharashtra to Maharashtra: State Code 27)
    const intra = calculateGST(100000, 18, "27", "27");
    assert.equal(intra.isInterState, false);
    assert.equal(intra.cgst, 9000);
    assert.equal(intra.sgst, 9000);
    assert.equal(intra.igst, 0);
    assert.equal(intra.totalTax, 18000);

    // Inter-state (Maharashtra 27 to Karnataka 29)
    const inter = calculateGST(100000, 18, "27", "29");
    assert.equal(inter.isInterState, true);
    assert.equal(inter.cgst, 0);
    assert.equal(inter.sgst, 0);
    assert.equal(inter.igst, 18000);
    assert.equal(inter.totalTax, 18000);
  });

  test("Validates 15-character Indian GSTIN structure and extracts state code", () => {
    const validResult = validateGSTIN("27AABCU9603R1ZM");
    assert.equal(validResult.isValid, true);
    assert.equal(validResult.stateCode, "27");

    const invalidResult = validateGSTIN("INVALID_GSTIN_123");
    assert.equal(invalidResult.isValid, false);
    assert.ok(invalidResult.message?.includes("Malformed GSTIN"));
  });
});
