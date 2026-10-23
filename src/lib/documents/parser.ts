import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";

export interface ParsedDocumentData {
  documentType: "TAX_INVOICE" | "PURCHASE_ORDER" | "GOODS_RECEIPT" | "CREDIT_NOTE" | "UNKNOWN";
  invoiceNumber?: string;
  poNumber?: string;
  grnNumber?: string;
  creditNoteNumber?: string;
  documentDate?: string;
  supplierName?: string;
  supplierGstin?: string;
  subtotal?: number;
  totalTaxAmount?: number;
  totalAmount?: number;
  currency?: string;
  isScanned?: boolean;
  lines: Array<{
    lineNumber: number;
    itemDescription: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    lineTotal: number;
  }>;
  extractedFields: Array<{
    name: string;
    value: string;
    confidence: number;
  }>;
  overallConfidence: number;
  validationWarnings: string[];
}

/**
 * Universal document parser supporting JSON, CSV, TSV, XLSX, XLS, and text-based PDFs.
 */
export async function parseStructuredDocumentAsync(
  filename: string,
  buffer: Buffer,
  documentTypeHint?: string
): Promise<ParsedDocumentData> {
  const ext = filename.toLowerCase();

  // Excel Workbooks (.xlsx, .xls)
  if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
    return parseExcelDocument(filename, buffer, documentTypeHint);
  }

  // PDF Documents (.pdf)
  if (ext.endsWith(".pdf")) {
    return parsePdfDocument(filename, buffer, documentTypeHint);
  }

  // Fallback to synchronous text / CSV / JSON parser
  return parseStructuredDocument(filename, buffer, documentTypeHint);
}

/**
 * Synchronous parser for CSV, TSV, TXT, JSON, and pre-extracted text buffers.
 */
export function parseStructuredDocument(
  filename: string,
  buffer: Buffer,
  documentTypeHint?: string
): ParsedDocumentData {
  const ext = filename.toLowerCase();
  const textContent = buffer.toString("utf-8");
  const extractedFields: Array<{ name: string; value: string; confidence: number }> = [];
  const validationWarnings: string[] = [];

  const result: ParsedDocumentData = {
    documentType: (documentTypeHint as any) || "TAX_INVOICE",
    currency: "INR",
    lines: [],
    extractedFields: [],
    overallConfidence: 0.95,
    validationWarnings: [],
  };

  // If JSON format
  if (ext.endsWith(".json")) {
    try {
      const parsed = JSON.parse(textContent);
      result.documentType = parsed.documentType || result.documentType;
      result.invoiceNumber = parsed.invoiceNumber || parsed.documentNumber;
      result.poNumber = parsed.poNumber;
      result.grnNumber = parsed.grnNumber;
      result.creditNoteNumber = parsed.creditNoteNumber;
      result.documentDate = parsed.documentDate || parsed.invoiceDate;
      result.supplierName = parsed.supplierName || parsed.vendorName;
      result.supplierGstin = parsed.supplierGstin || parsed.gstin;
      result.subtotal = Number(parsed.subtotal || 0);
      result.totalTaxAmount = Number(parsed.totalTaxAmount || parsed.taxAmount || 0);
      result.totalAmount = Number(parsed.totalAmount || 0);
      result.lines = Array.isArray(parsed.lines)
        ? parsed.lines.map((l: any, idx: number) => ({
            lineNumber: idx + 1,
            itemDescription: l.itemDescription || l.description || `Item ${idx + 1}`,
            sku: l.sku,
            quantity: Number(l.quantity || l.billedQuantity || 1),
            unitPrice: Number(l.unitPrice || 0),
            taxRate: Number(l.taxRate || 18),
            lineTotal: Number(l.lineTotal || 0),
          }))
        : [];
      result.overallConfidence = 0.99;
    } catch {
      validationWarnings.push("Failed to parse JSON content.");
      result.overallConfidence = 0.5;
    }
  } else if (ext.endsWith(".csv") || ext.endsWith(".tsv") || ext.endsWith(".txt")) {
    const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const separator = ext.endsWith(".tsv") || textContent.includes("\t") ? "\t" : ",";

    extractKeyValuesFromLines(lines, separator, result);
  } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
    return parseExcelDocument(filename, buffer, documentTypeHint);
  } else {
    // Binary/unknown format fallback
    result.overallConfidence = 0.85;
    const safeText = textContent.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
    const invMatch = safeText.match(/(?:INV|BILL)-[0-9]{4}-[0-9]+/i);
    if (invMatch) result.invoiceNumber = invMatch[0].toUpperCase();

    const poMatch = safeText.match(/PO-[0-9]{4}-[0-9]+/i);
    if (poMatch) result.poNumber = poMatch[0].toUpperCase();
  }

  populateExtractedFields(result, extractedFields);
  result.extractedFields = extractedFields;
  return result;
}

/**
 * Parses XLSX and XLS spreadsheets using SheetJS.
 */
function parseExcelDocument(
  filename: string,
  buffer: Buffer,
  documentTypeHint?: string
): ParsedDocumentData {
  const result: ParsedDocumentData = {
    documentType: (documentTypeHint as any) || "TAX_INVOICE",
    currency: "INR",
    lines: [],
    extractedFields: [],
    overallConfidence: 0.95,
    validationWarnings: [],
  };

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      result.validationWarnings.push("Excel workbook contains no sheets.");
      result.overallConfidence = 0.4;
      return result;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rowStr = row.map((cell) => String(cell || "")).join(" ");
      const rowLower = rowStr.toLowerCase();

      // Check for Invoice / PO / Vendor headers
      if (rowLower.includes("invoice") && (rowLower.includes("no") || rowLower.includes("number"))) {
        const match = rowStr.match(/(?:invoice\s*(?:number|no|num|id|#)?[:\t\s]+)([A-Za-z0-9-_/]+)/i);
        if (match && match[1]) result.invoiceNumber = match[1];
      }
      if (rowLower.includes("po") && (rowLower.includes("no") || rowLower.includes("ref") || rowLower.includes("order") || rowLower.includes("number"))) {
        const match = rowStr.match(/(?:po\s*(?:reference|number|order|no|num|ref|#)?[:\t\s]+)([A-Za-z0-9-_/]+)/i);
        if (match && match[1]) result.poNumber = match[1];
      }
      if (rowLower.includes("gstin") || rowLower.includes("gst no")) {
        const match = rowStr.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/);
        if (match && match[1]) result.supplierGstin = match[1];
      }
      if (rowLower.includes("vendor") || rowLower.includes("supplier") || rowLower.includes("m/s")) {
        const match = rowStr.match(/(?:supplier|vendor|m\/s)[:\t\s]+([^,;\t\n]+)/i);
        if (match && match[1]) result.supplierName = match[1].trim();
      }

      // Check for tabular item row: Description, Qty, Rate, Total
      if (row.length >= 3) {
        const desc = String(row[0] || "");
        const qty = Number(row[1]);
        const rate = Number(row[2]);
        const total = row[3] !== undefined ? Number(row[3]) : qty * rate;

        if (desc.length > 2 && !isNaN(qty) && !isNaN(rate) && qty > 0 && rate > 0) {
          result.lines.push({
            lineNumber: result.lines.length + 1,
            itemDescription: desc,
            quantity: qty,
            unitPrice: rate,
            taxRate: 18,
            lineTotal: !isNaN(total) && total > 0 ? total : qty * rate,
          });
        }
      }
    }

    if (result.lines.length > 0) {
      result.subtotal = result.lines.reduce((acc, l) => acc + l.lineTotal, 0);
      result.totalTaxAmount = Math.round(result.subtotal * 0.18 * 100) / 100;
      result.totalAmount = Math.round((result.subtotal + result.totalTaxAmount) * 100) / 100;
    }
  } catch (err: any) {
    result.validationWarnings.push(`Failed to parse Excel file: ${err.message}`);
    result.overallConfidence = 0.5;
  }

  const fields: Array<{ name: string; value: string; confidence: number }> = [];
  populateExtractedFields(result, fields);
  result.extractedFields = fields;
  return result;
}

/**
 * Parses text-based PDF documents using pdf-parse.
 */
async function parsePdfDocument(
  filename: string,
  buffer: Buffer,
  documentTypeHint?: string
): Promise<ParsedDocumentData> {
  const result: ParsedDocumentData = {
    documentType: (documentTypeHint as any) || "TAX_INVOICE",
    currency: "INR",
    lines: [],
    extractedFields: [],
    overallConfidence: 0.92,
    validationWarnings: [],
  };

  try {
    const parser = new PDFParse(new Uint8Array(buffer));
    const textResult = await parser.getText();
    const pdfText = typeof textResult === "string" ? textResult : (textResult?.text || "");

    if (!pdfText || pdfText.trim().length < 20) {
      // Scanned document without text layer
      result.isScanned = true;
      result.overallConfidence = 0.70;
      result.validationWarnings.push(
        "PDF appears to be a scanned image without embedded text layer. Recommend manual audit review or optical OCR inspection."
      );
    } else {
      // Extract invoice, PO, GSTIN, and monetary totals from text
      const invMatch = pdfText.match(/(?:Invoice\s*(?:No|Number|#)?[ :]*)([A-Za-z0-9-_/]+)/i);
      if (invMatch) result.invoiceNumber = invMatch[1].trim();

      const poMatch = pdfText.match(/(?:PO\s*(?:No|Number|Ref|#)?[ :]*)([A-Za-z0-9-_/]+)/i);
      if (poMatch) result.poNumber = poMatch[1].trim();

      const gstinMatch = pdfText.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/);
      if (gstinMatch) result.supplierGstin = gstinMatch[1].trim();

      const totalMatch = pdfText.match(/(?:Total\s*(?:Amount)?|Grand\s*Total)[ :₹Rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
      if (totalMatch) {
        const cleanTotal = Number(totalMatch[1].replace(/,/g, ""));
        if (!isNaN(cleanTotal) && cleanTotal > 0) {
          result.totalAmount = cleanTotal;
          result.subtotal = Math.round((cleanTotal / 1.18) * 100) / 100;
          result.totalTaxAmount = Math.round((cleanTotal - result.subtotal) * 100) / 100;
        }
      }
    }
  } catch (err: any) {
    result.validationWarnings.push(`PDF parsing encountered an exception: ${err.message}`);
    result.overallConfidence = 0.6;
  }

  const fields: Array<{ name: string; value: string; confidence: number }> = [];
  populateExtractedFields(result, fields);
  result.extractedFields = fields;
  return result;
}

function extractKeyValuesFromLines(lines: string[], separator: string, result: ParsedDocumentData) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const joined = line.toLowerCase();

    if (joined.includes("invoice") && (joined.includes("no") || joined.includes("number"))) {
      const match = line.match(/(?:invoice\s*(?:number|no|num|id|#)?[:\t\s]+)([A-Za-z0-9-_/]+)/i);
      if (match && match[1]) result.invoiceNumber = match[1];
    }
    if (joined.includes("po") && (joined.includes("no") || joined.includes("ref") || joined.includes("order") || joined.includes("number"))) {
      const match = line.match(/(?:po\s*(?:reference|number|order|no|num|ref|#)?[:\t\s]+)([A-Za-z0-9-_/]+)/i);
      if (match && match[1]) result.poNumber = match[1];
    }
    if (joined.includes("gstin") || joined.includes("gst no")) {
      const match = line.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/);
      if (match && match[1]) result.supplierGstin = match[1];
    }
    if (joined.includes("supplier") || joined.includes("vendor") || joined.includes("m/s")) {
      const match = line.match(/(?:supplier|vendor|m\/s)[:\t\s]+([^,;\t\n]+)/i);
      if (match && match[1]) result.supplierName = match[1].trim();
    }

    if (cols.length >= 4 && !isNaN(Number(cols[1])) && !isNaN(Number(cols[2]))) {
      const desc = cols[0];
      const qty = Number(cols[1]);
      const rate = Number(cols[2]);
      const total = cols[3] && !isNaN(Number(cols[3])) ? Number(cols[3]) : qty * rate;

      if (qty > 0 && rate > 0) {
        result.lines.push({
          lineNumber: result.lines.length + 1,
          itemDescription: desc,
          quantity: qty,
          unitPrice: rate,
          taxRate: 18,
          lineTotal: total,
        });
      }
    }
  }

  if (result.lines.length > 0) {
    result.subtotal = result.lines.reduce((acc, l) => acc + l.lineTotal, 0);
    result.totalTaxAmount = Math.round(result.subtotal * 0.18 * 100) / 100;
    result.totalAmount = Math.round((result.subtotal + result.totalTaxAmount) * 100) / 100;
    result.overallConfidence = 0.94;
  }
}

function populateExtractedFields(
  result: ParsedDocumentData,
  extractedFields: Array<{ name: string; value: string; confidence: number }>
) {
  if (result.invoiceNumber) {
    extractedFields.push({ name: "invoiceNumber", value: result.invoiceNumber, confidence: 0.98 });
  }
  if (result.poNumber) {
    extractedFields.push({ name: "poNumber", value: result.poNumber, confidence: 0.96 });
  }
  if (result.supplierName) {
    extractedFields.push({ name: "supplierName", value: result.supplierName, confidence: 0.95 });
  }
  if (result.supplierGstin) {
    extractedFields.push({ name: "gstin", value: result.supplierGstin, confidence: 0.99 });
  }
  if (result.totalAmount) {
    extractedFields.push({ name: "totalAmount", value: `₹${result.totalAmount.toFixed(2)}`, confidence: 0.97 });
  }
}
