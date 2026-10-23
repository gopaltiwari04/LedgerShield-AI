import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseStructuredDocumentAsync, parseStructuredDocument } from "../lib/documents/parser";
import { saveDocumentFile, readDocumentFile } from "../lib/documents/storage";

describe("LedgerShield Document Pipeline: Spreadsheets & Storage Abstraction", () => {
  test("Parses multi-row XLSX Excel invoices and extracts line items and tax totals", async () => {
    // Generate real in-memory XLSX buffer
    const workbook = XLSX.utils.book_new();
    const sheetData = [
      ["Tax Invoice", "", "", ""],
      ["Invoice Number: INV-XLS-2024-88", "", "", ""],
      ["PO Reference: PO-2024-550", "", "", ""],
      ["Supplier: Precision Fasteners Ltd", "", "", ""],
      ["GSTIN: 27AABCP1234F1Z5", "", "", ""],
      ["Description", "Quantity", "Rate", "Total"],
      ["High Tensile Hex Bolts M12", 500, 45.0, 22500.0],
      ["Nylon Lock Nuts M12", 500, 15.0, 7500.0],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const parsed = await parseStructuredDocumentAsync("invoice-88.xlsx", xlsxBuffer);

    assert.equal(parsed.invoiceNumber, "INV-XLS-2024-88");
    assert.equal(parsed.poNumber, "PO-2024-550");
    assert.equal(parsed.supplierName, "Precision Fasteners Ltd");
    assert.equal(parsed.supplierGstin, "27AABCP1234F1Z5");
    assert.equal(parsed.lines.length, 2);
    assert.equal(parsed.lines[0].itemDescription, "High Tensile Hex Bolts M12");
    assert.equal(parsed.lines[0].quantity, 500);
    assert.equal(parsed.lines[0].unitPrice, 45.0);
    assert.equal(parsed.subtotal, 30000.0);
    assert.equal(parsed.totalAmount, 35400.0); // 30000 + 18% GST (5400)
    assert.ok(parsed.overallConfidence >= 0.9);
  });

  test("Parses TSV (Tab-Separated Values) document formats", () => {
    const tsvContent = [
      "Invoice Number\tINV-TSV-001",
      "PO Reference\tPO-2024-77",
      "Supplier\tOmega Logistics Hub",
      "Description\tQuantity\tUnit Rate\tTotal",
      "Warehousing Pallet Space\t20\t1500\t30000",
    ].join("\n");

    const parsed = parseStructuredDocument("logistics.tsv", Buffer.from(tsvContent, "utf-8"));
    assert.equal(parsed.invoiceNumber, "INV-TSV-001");
    assert.equal(parsed.poNumber, "PO-2024-77");
    assert.equal(parsed.supplierName, "Omega Logistics Hub");
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0].quantity, 20);
    assert.equal(parsed.lines[0].unitPrice, 1500);
    assert.equal(parsed.subtotal, 30000);
  });

  test("Isolates document storage paths by organization and prevents path traversal", async () => {
    const testOrgId = `org-test-storage-${Date.now()}`;
    const fileContent = Buffer.from("Sample financial invoice content", "utf-8");

    // 1. Save document
    const saved = await saveDocumentFile(testOrgId, "audit_invoice.pdf", fileContent);
    assert.ok(saved.storageKey);
    assert.ok(saved.fileHashSha256);
    assert.equal(saved.fileSize, fileContent.length);

    // 2. Read back from storage using valid org context
    const retrieved = await readDocumentFile(testOrgId, saved.storageKey);
    assert.deepEqual(retrieved, fileContent);

    // 3. Prohibit path traversal attempts (e.g. attempting to break out of org folder)
    const maliciousKey = `../../other-org/${saved.storageKey}`;
    // readDocumentFile sanitizes with path.basename, keeping it inside testOrgId
    const safeRead = await readDocumentFile(testOrgId, maliciousKey);
    assert.deepEqual(safeRead, fileContent);
  });
});
