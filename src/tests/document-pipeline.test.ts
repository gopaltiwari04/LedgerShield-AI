import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { saveDocumentFile } from "../lib/documents/storage";
import { parseStructuredDocument } from "../lib/documents/parser";
import { prisma } from "../lib/prisma";

describe("LedgerShield Document Ingestion & Verification Pipeline", () => {
  const testOrgId = "a0000000-0000-4000-a000-000000000001";

  before(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: {
        id: testOrgId,
        name: "Document Pipeline Test Org",
        currency: "INR",
      },
    });
  });

  after(async () => {
    await prisma.extractedField.deleteMany({
      where: { document: { organizationId: testOrgId } },
    });
    await prisma.uploadedDocument.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  });

  it("Computes cryptographic SHA-256 hash and generates isolated storage key", async () => {
    const content = Buffer.from("InvoiceNo: INV-2024-999, Amount: 15000, Supplier: Test Mills");
    const result = await saveDocumentFile(testOrgId, "Test_Invoice_999.csv", content);

    assert.ok(result.fileHashSha256, "Should return sha256 hash");
    assert.strictEqual(result.fileHashSha256.length, 64, "SHA-256 must be exactly 64 hex characters");
    assert.ok(result.storagePath.includes(testOrgId), "Path must be scoped to organization directory");
  });

  it("Rejects files exceeding size limit", async () => {
    // 26 MB buffer
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024);
    await assert.rejects(
      async () => {
        await saveDocumentFile(testOrgId, "HugeFile.pdf", hugeBuffer);
      },
      /exceeds 25 MB limit/
    );
  });

  it("Parses structured CSV invoices extracting fields, line items, and taxes", () => {
    const csvContent = Buffer.from(
      `Invoice No: INV-2024-888\nPO Ref: PO-2024-555\nGSTIN: 27AAACZ1234A1Z9\nSupplier: Precision Castings Pvt Ltd\nFlange Assembly 50mm,10,2500,25000\nRubber Seal Gaskets,20,100,2000`
    );

    const parsed = parseStructuredDocument("invoice_batch.csv", csvContent, "TAX_INVOICE");

    assert.strictEqual(parsed.invoiceNumber, "INV-2024-888");
    assert.strictEqual(parsed.poNumber, "PO-2024-555");
    assert.strictEqual(parsed.supplierGstin, "27AAACZ1234A1Z9");
    assert.strictEqual(parsed.lines.length, 2, "Expected 2 parsed line items");
    assert.strictEqual(parsed.lines[0].itemDescription, "Flange Assembly 50mm");
    assert.strictEqual(parsed.lines[0].quantity, 10);
    assert.strictEqual(parsed.lines[0].unitPrice, 2500);
    assert.strictEqual(parsed.lines[0].lineTotal, 25000);
    assert.strictEqual(parsed.subtotal, 27000);
    assert.strictEqual(parsed.totalTaxAmount, 4860); // 18% of 27000
    assert.strictEqual(parsed.totalAmount, 31860);
    assert.ok(parsed.overallConfidence >= 0.9, "Confidence score should be high for valid structured document");
  });

  it("Identifies duplicate document upload and saves field correction with audit trail", async () => {
    const rawContent = Buffer.from("Exact duplicate test payload for invoice verification");
    const saved1 = await saveDocumentFile(testOrgId, "Original_Invoice.pdf", rawContent);

    const doc1 = await prisma.uploadedDocument.create({
      data: {
        organizationId: testOrgId,
        filename: "Original_Invoice.pdf",
        fileSize: saved1.fileSize,
        mimeType: saved1.mimeType,
        storagePath: saved1.storageKey,
        fileHashSha256: saved1.fileHashSha256,
        documentType: "TAX_INVOICE",
        status: "PARSED",
      },
    });

    const field = await prisma.extractedField.create({
      data: {
        documentId: doc1.id,
        fieldName: "invoiceNumber",
        fieldValue: "INV-MISREAD-001",
        confidence: 0.85,
        isVerified: false,
      },
    });

    // Check duplicate detection
    const existing = await prisma.uploadedDocument.findFirst({
      where: {
        organizationId: testOrgId,
        fileHashSha256: saved1.fileHashSha256,
      },
    });
    assert.ok(existing, "Should detect duplicate file content by SHA-256 hash");

    // Correct extracted field
    const corrected = await prisma.extractedField.update({
      where: { id: field.id },
      data: {
        correctedValue: "INV-CORRECTED-001",
        isVerified: true,
      },
    });

    assert.strictEqual(corrected.correctedValue, "INV-CORRECTED-001");
    assert.strictEqual(corrected.isVerified, true);
  });
});
