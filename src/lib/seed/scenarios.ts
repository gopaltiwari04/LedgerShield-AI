import {
  ReconciliationDataset,
  POData,
  InvoiceData,
  GRNData,
  PaymentData,
  CreditNoteData,
} from "../reconciliation/engine";
import { SupplierEntity, DocumentUploadMeta } from "../integrity/monitor";

export interface SeedDataBundle {
  dataset: ReconciliationDataset;
  suppliers: SupplierEntity[];
  uploadedDocuments: DocumentUploadMeta[];
  description: string;
}

export function generateScenariosDataset(): SeedDataBundle {
  // 1. Suppliers
  const suppliers: SupplierEntity[] = [
    {
      id: "sup-apex",
      vendorCode: "VEND-101",
      name: "Apex Industrial Supplies Pvt Ltd",
      bankAccountNumber: "HDFC000123456789",
      ifscCode: "HDFC0000240",
      contactEmail: "billing@apexindustrial.in",
    },
    {
      id: "sup-bharat",
      vendorCode: "VEND-102",
      name: "Bharat Precision Forgings Ltd",
      bankAccountNumber: "ICIC000987654321",
      ifscCode: "ICIC0000102",
      contactEmail: "accounts@bharatprecision.in",
    },
    {
      id: "sup-delta",
      vendorCode: "VEND-103",
      name: "Delta Logistics & Packaging Solutions",
      bankAccountNumber: "SBIN00044556677",
      ifscCode: "SBIN0001234",
      contactEmail: "invoices@deltapack.co.in",
    },
    {
      id: "sup-zenith",
      vendorCode: "VEND-104",
      name: "Zenith Engineering Spares LLP",
      // Notice: Zenith shares the exact same bank account as Apex (Scenario F collusion indicator!)
      bankAccountNumber: "HDFC000123456789",
      ifscCode: "HDFC0000240",
      contactEmail: "contact@zenithspares.in",
    },
    {
      id: "sup-kalyan",
      vendorCode: "VEND-105",
      name: "Kalyan Raw Materials & Steels",
      bankAccountNumber: "UTIB00055443322",
      ifscCode: "UTIB0000450",
      contactEmail: "sales@kalyansteels.com",
    },
  ];

  // 2. Purchase Orders
  const purchaseOrders: POData[] = [
    // SCENARIO A: PO-2024-001 (100 units @ ₹500)
    {
      id: "po-1",
      poNumber: "PO-2024-001",
      poDate: "2024-05-10T10:00:00Z",
      supplierId: "sup-apex",
      supplierName: "Apex Industrial Supplies Pvt Ltd",
      vendorCode: "VEND-101",
      status: "APPROVED",
      currency: "INR",
      subtotal: 50000.0,
      taxAmount: 9000.0, // 18%
      totalAmount: 59000.0,
      lines: [
        {
          id: "pol-1",
          itemDescription: "Heavy Duty Flange Bearing 50mm",
          sku: "BRG-50MM",
          orderedQuantity: 100,
          unitPrice: 500.0,
          taxRate: 18.0,
          lineTotal: 59000.0,
        },
      ],
    },

    // SCENARIO B: PO-2024-002 (100 units @ ₹200)
    {
      id: "po-2",
      poNumber: "PO-2024-002",
      poDate: "2024-05-12T11:00:00Z",
      supplierId: "sup-bharat",
      supplierName: "Bharat Precision Forgings Ltd",
      vendorCode: "VEND-102",
      status: "APPROVED",
      currency: "INR",
      subtotal: 20000.0,
      taxAmount: 3600.0,
      totalAmount: 23600.0,
      lines: [
        {
          id: "pol-2",
          itemDescription: "Hardened Steel Hex Bolts M16",
          sku: "BLT-HEX-M16",
          orderedQuantity: 100,
          unitPrice: 200.0,
          taxRate: 18.0,
          lineTotal: 23600.0,
        },
      ],
    },

    // SCENARIO G: Legitimate Partial Delivery PO-2024-007 (500 units @ ₹100)
    {
      id: "po-7",
      poNumber: "PO-2024-007",
      poDate: "2024-06-01T09:30:00Z",
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      vendorCode: "VEND-103",
      status: "APPROVED",
      currency: "INR",
      subtotal: 50000.0,
      taxAmount: 9000.0,
      totalAmount: 59000.0,
      lines: [
        {
          id: "pol-7",
          itemDescription: "Corrugated Export Packaging Cartons 5-Ply",
          sku: "PKG-EXP-5PLY",
          orderedQuantity: 500,
          unitPrice: 100.0,
          taxRate: 18.0,
          lineTotal: 59000.0,
        },
      ],
    },

    // SCENARIO I: Approved PO Amendment PO-2024-009 (Originally ₹500, amended to ₹600)
    {
      id: "po-9",
      poNumber: "PO-2024-009",
      poDate: "2024-06-10T10:00:00Z",
      supplierId: "sup-kalyan",
      supplierName: "Kalyan Raw Materials & Steels",
      vendorCode: "VEND-105",
      status: "AMENDED",
      currency: "INR",
      subtotal: 60000.0,
      taxAmount: 10800.0,
      totalAmount: 70800.0,
      lines: [
        {
          id: "pol-9",
          itemDescription: "Structural Carbon Steel Rod 25mm",
          sku: "STL-ROD-25MM",
          orderedQuantity: 100,
          unitPrice: 500.0, // Base price before amendment
          taxRate: 18.0,
          lineTotal: 70800.0,
        },
      ],
      amendments: [
        {
          amendmentNumber: 1,
          amendmentDate: "2024-06-12T14:00:00Z",
          reason: "Global commodity raw steel index revision approved by Procurement VP",
          previousAmount: 59000.0,
          newAmount: 70800.0, // ₹600/unit with tax
          approvedBy: "VP Procurement - Rajesh Mehta",
        },
      ],
    },
  ];

  // 3. Invoices
  const invoices: InvoiceData[] = [
    // SCENARIO A: Invoiced @ ₹550 vs PO @ ₹500 (Variance of ₹5,000 before tax, ₹5,900 with tax)
    {
      id: "inv-101",
      invoiceNumber: "INV-2024-101",
      invoiceDate: "2024-05-18T10:00:00Z",
      poNumber: "PO-2024-001",
      supplierId: "sup-apex",
      supplierName: "Apex Industrial Supplies Pvt Ltd",
      vendorCode: "VEND-101",
      status: "PENDING_REVIEW",
      subtotal: 55000.0,
      cgstAmount: 4950.0,
      sgstAmount: 4950.0,
      igstAmount: 0.0,
      totalTaxAmount: 9900.0,
      totalAmount: 64900.0,
      paidAmount: 64900.0, // Paid in full, recoverable
      ocrConfidence: 0.98,
      fileReference: "/uploads/invoices/INV-2024-101.pdf",
      lines: [
        {
          id: "invl-101-1",
          itemDescription: "Heavy Duty Flange Bearing 50mm",
          billedQuantity: 100,
          unitPrice: 550.0, // Overcharge!
          taxRate: 18.0,
          cgstAmount: 4950.0,
          sgstAmount: 4950.0,
          lineTotal: 64900.0,
        },
      ],
    },

    // SCENARIO B: Invoiced for 100 units, but GRN shows only 90 accepted
    {
      id: "inv-102",
      invoiceNumber: "INV-2024-102",
      invoiceDate: "2024-05-20T11:00:00Z",
      poNumber: "PO-2024-002",
      supplierId: "sup-bharat",
      supplierName: "Bharat Precision Forgings Ltd",
      vendorCode: "VEND-102",
      status: "PENDING_REVIEW",
      subtotal: 20000.0,
      cgstAmount: 1800.0,
      sgstAmount: 1800.0,
      igstAmount: 0.0,
      totalTaxAmount: 3600.0,
      totalAmount: 23600.0,
      paidAmount: 23600.0,
      ocrConfidence: 0.97,
      fileReference: "/uploads/invoices/INV-2024-102.pdf",
      lines: [
        {
          id: "invl-102-1",
          itemDescription: "Hardened Steel Hex Bolts M16",
          billedQuantity: 100, // Invoiced 100, but only 90 received!
          unitPrice: 200.0,
          taxRate: 18.0,
          cgstAmount: 1800.0,
          sgstAmount: 1800.0,
          lineTotal: 23600.0,
        },
      ],
    },

    // SCENARIO C: Invoice of ₹50,000 paid twice
    {
      id: "inv-103",
      invoiceNumber: "INV-2024-103",
      invoiceDate: "2024-05-25T14:00:00Z",
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      vendorCode: "VEND-103",
      status: "PAID",
      subtotal: 42372.88,
      cgstAmount: 3813.56,
      sgstAmount: 3813.56,
      igstAmount: 0.0,
      totalTaxAmount: 7627.12,
      totalAmount: 50000.0,
      paidAmount: 100000.0, // Two payments of ₹50k each!
      ocrConfidence: 0.99,
      lines: [
        {
          id: "invl-103-1",
          itemDescription: "Heavy Duty Storage Racks Assembly",
          billedQuantity: 1,
          unitPrice: 42372.88,
          taxRate: 18.0,
          lineTotal: 50000.0,
        },
      ],
    },

    // SCENARIO E: Three Split Invoices just below ₹50,000 limit (₹48,000, ₹49,000, ₹47,000)
    {
      id: "inv-104-a",
      invoiceNumber: "INV-SPLIT-401",
      invoiceDate: "2024-06-02T10:00:00Z",
      supplierId: "sup-zenith",
      supplierName: "Zenith Engineering Spares LLP",
      vendorCode: "VEND-104",
      status: "PAID",
      subtotal: 40677.96,
      cgstAmount: 3661.02,
      sgstAmount: 3661.02,
      igstAmount: 0.0,
      totalTaxAmount: 7322.04,
      totalAmount: 48000.0, // Below ₹50,000 limit
      paidAmount: 48000.0,
      ocrConfidence: 0.95,
      lines: [
        {
          id: "invl-401-1",
          itemDescription: "Pneumatic Valve Assembly Batch A",
          billedQuantity: 20,
          unitPrice: 2033.9,
          taxRate: 18.0,
          lineTotal: 48000.0,
        },
      ],
    },
    {
      id: "inv-104-b",
      invoiceNumber: "INV-SPLIT-402",
      invoiceDate: "2024-06-03T11:30:00Z",
      supplierId: "sup-zenith",
      supplierName: "Zenith Engineering Spares LLP",
      vendorCode: "VEND-104",
      status: "PAID",
      subtotal: 41525.42,
      cgstAmount: 3737.29,
      sgstAmount: 3737.29,
      igstAmount: 0.0,
      totalTaxAmount: 7474.58,
      totalAmount: 49000.0, // Below ₹50,000 limit
      paidAmount: 49000.0,
      ocrConfidence: 0.96,
      lines: [
        {
          id: "invl-402-1",
          itemDescription: "Pneumatic Valve Assembly Batch B",
          billedQuantity: 20,
          unitPrice: 2076.27,
          taxRate: 18.0,
          lineTotal: 49000.0,
        },
      ],
    },
    {
      id: "inv-104-c",
      invoiceNumber: "INV-SPLIT-403",
      invoiceDate: "2024-06-04T15:00:00Z",
      supplierId: "sup-zenith",
      supplierName: "Zenith Engineering Spares LLP",
      vendorCode: "VEND-104",
      status: "PENDING_REVIEW",
      subtotal: 39830.5,
      cgstAmount: 3584.75,
      sgstAmount: 3584.75,
      igstAmount: 0.0,
      totalTaxAmount: 7169.5,
      totalAmount: 47000.0, // Below ₹50,000 limit
      paidAmount: 0.0,
      ocrConfidence: 0.96,
      lines: [
        {
          id: "invl-403-1",
          itemDescription: "Pneumatic Valve Assembly Batch C",
          billedQuantity: 20,
          unitPrice: 1991.52,
          taxRate: 18.0,
          lineTotal: 47000.0,
        },
      ],
    },

    // SCENARIO G: Legitimate Partial Delivery Invoice (500 units billed)
    {
      id: "inv-107",
      invoiceNumber: "INV-2024-107",
      invoiceDate: "2024-06-08T12:00:00Z",
      poNumber: "PO-2024-007",
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      vendorCode: "VEND-103",
      status: "PENDING_REVIEW",
      subtotal: 50000.0,
      cgstAmount: 4500.0,
      sgstAmount: 4500.0,
      igstAmount: 0.0,
      totalTaxAmount: 9000.0,
      totalAmount: 59000.0,
      paidAmount: 0.0,
      ocrConfidence: 0.99,
      lines: [
        {
          id: "invl-107-1",
          itemDescription: "Corrugated Export Packaging Cartons 5-Ply",
          billedQuantity: 500,
          unitPrice: 100.0,
          taxRate: 18.0,
          lineTotal: 59000.0,
        },
      ],
    },

    // SCENARIO I: Invoice matching Approved PO Amendment rate (100 units @ ₹600 + tax = ₹70,800)
    {
      id: "inv-109",
      invoiceNumber: "INV-2024-109",
      invoiceDate: "2024-06-15T10:00:00Z",
      poNumber: "PO-2024-009",
      supplierId: "sup-kalyan",
      supplierName: "Kalyan Raw Materials & Steels",
      vendorCode: "VEND-105",
      status: "APPROVED",
      subtotal: 60000.0,
      cgstAmount: 5400.0,
      sgstAmount: 5400.0,
      igstAmount: 0.0,
      totalTaxAmount: 10800.0,
      totalAmount: 70800.0,
      paidAmount: 70800.0,
      ocrConfidence: 0.99,
      lines: [
        {
          id: "invl-109-1",
          itemDescription: "Structural Carbon Steel Rod 25mm",
          billedQuantity: 100,
          unitPrice: 600.0, // Matches amended rate! NOT an overcharge.
          taxRate: 18.0,
          lineTotal: 70800.0,
        },
      ],
    },
  ];

  // 4. Goods Receipts (GRNs)
  const goodsReceipts: GRNData[] = [
    // Scenario A: 100 units received (no quantity error, purely price overcharge)
    {
      id: "grn-1",
      grnNumber: "GRN-2024-001",
      grnDate: "2024-05-15T14:00:00Z",
      poNumber: "PO-2024-001",
      supplierId: "sup-apex",
      supplierName: "Apex Industrial Supplies Pvt Ltd",
      receivedBy: "Warehouse Gate 2 - Suresh Patil",
      lines: [
        {
          id: "grnl-1",
          itemDescription: "Heavy Duty Flange Bearing 50mm",
          receivedQuantity: 100,
          acceptedQuantity: 100,
          rejectedQuantity: 0,
        },
      ],
    },

    // Scenario B: Under-delivery! Ordered 100, invoiced 100, but only 90 accepted!
    {
      id: "grn-2",
      grnNumber: "GRN-2024-002",
      grnDate: "2024-05-16T16:00:00Z",
      poNumber: "PO-2024-002",
      supplierId: "sup-bharat",
      supplierName: "Bharat Precision Forgings Ltd",
      receivedBy: "Warehouse Gate 1 - Amit Kumar",
      lines: [
        {
          id: "grnl-2",
          itemDescription: "Hardened Steel Hex Bolts M16",
          receivedQuantity: 90,
          acceptedQuantity: 90,
          rejectedQuantity: 0,
        },
      ],
    },

    // Scenario G: Legitimate Partial Deliveries summing up to 500 units!
    // Delivery 1: 300 units
    {
      id: "grn-7a",
      grnNumber: "GRN-2024-007A",
      grnDate: "2024-06-04T10:00:00Z",
      poNumber: "PO-2024-007",
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      receivedBy: "Warehouse Central - Suresh Patil",
      lines: [
        {
          id: "grnl-7a",
          itemDescription: "Corrugated Export Packaging Cartons 5-Ply",
          receivedQuantity: 300,
          acceptedQuantity: 300,
          rejectedQuantity: 0,
        },
      ],
    },
    // Delivery 2: 200 units (Cumulative = 500 units!)
    {
      id: "grn-7b",
      grnNumber: "GRN-2024-007B",
      grnDate: "2024-06-07T11:00:00Z",
      poNumber: "PO-2024-007",
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      receivedBy: "Warehouse Central - Suresh Patil",
      lines: [
        {
          id: "grnl-7b",
          itemDescription: "Corrugated Export Packaging Cartons 5-Ply",
          receivedQuantity: 200,
          acceptedQuantity: 200,
          rejectedQuantity: 0,
        },
      ],
    },

    // Scenario I: 100 units received
    {
      id: "grn-9",
      grnNumber: "GRN-2024-009",
      grnDate: "2024-06-14T10:00:00Z",
      poNumber: "PO-2024-009",
      supplierId: "sup-kalyan",
      supplierName: "Kalyan Raw Materials & Steels",
      receivedBy: "Warehouse Gate 2 - Suresh Patil",
      lines: [
        {
          id: "grnl-9",
          itemDescription: "Structural Carbon Steel Rod 25mm",
          receivedQuantity: 100,
          acceptedQuantity: 100,
          rejectedQuantity: 0,
        },
      ],
    },
  ];

  // 5. Payments
  const payments: PaymentData[] = [
    // Payment for INV-2024-101
    {
      id: "pmt-1",
      paymentReference: "CMS-NEFT-992144",
      paymentDate: "2024-05-28T12:00:00Z",
      amount: 64900.0,
      supplierId: "sup-apex",
      supplierName: "Apex Industrial Supplies Pvt Ltd",
      allocatedInvoiceNumbers: ["INV-2024-101"],
    },
    // Payment for INV-2024-102
    {
      id: "pmt-2",
      paymentReference: "CMS-NEFT-992188",
      paymentDate: "2024-05-30T14:00:00Z",
      amount: 23600.0,
      supplierId: "sup-bharat",
      supplierName: "Bharat Precision Forgings Ltd",
      allocatedInvoiceNumbers: ["INV-2024-102"],
    },
    // SCENARIO C: Duplicate Payments for INV-2024-103 (Each ₹50,000!)
    {
      id: "pmt-3a",
      paymentReference: "CMS-RTGS-554101",
      paymentDate: "2024-05-29T10:30:00Z",
      amount: 50000.0,
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      allocatedInvoiceNumbers: ["INV-2024-103"],
    },
    {
      id: "pmt-3b",
      paymentReference: "CMS-RTGS-554109",
      paymentDate: "2024-05-31T16:15:00Z",
      amount: 50000.0,
      supplierId: "sup-delta",
      supplierName: "Delta Logistics & Packaging Solutions",
      allocatedInvoiceNumbers: ["INV-2024-103"],
    },
  ];

  // 6. Credit Notes (SCENARIO D: Unapplied Credit Note of ₹12,000)
  const creditNotes: CreditNoteData[] = [
    {
      id: "cn-1",
      creditNoteNumber: "CN-2024-088",
      creditDate: "2024-05-22T10:00:00Z",
      supplierId: "sup-bharat",
      supplierName: "Bharat Precision Forgings Ltd",
      amount: 12000.0,
      reason: "Rate difference adjustment for Batch Q2-Steel as per quarterly settlement",
      isApplied: false, // UNAPPLIED!
    },
  ];

  // 7. Uploaded Documents (SCENARIO H: Duplicate document file upload)
  const uploadedDocuments: DocumentUploadMeta[] = [
    {
      id: "doc-1",
      filename: "Apex_May_Invoice_101.pdf",
      fileHashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      invoiceNumber: "INV-2024-101",
      totalAmount: 64900.0,
      uploadedAt: "2024-05-18T10:05:00Z",
    },
    {
      id: "doc-2",
      // Same hash as doc-1 with a different filename!
      filename: "Scanned_Apex_Invoice_101_ReUpload.pdf",
      fileHashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      invoiceNumber: "INV-2024-101",
      totalAmount: 64900.0,
      uploadedAt: "2024-05-20T09:12:00Z",
    },
  ];

  return {
    dataset: {
      purchaseOrders,
      invoices,
      goodsReceipts,
      payments,
      creditNotes,
    },
    suppliers,
    uploadedDocuments,
    description: "Synthetic benchmark dataset incorporating Scenarios A through J.",
  };
}
