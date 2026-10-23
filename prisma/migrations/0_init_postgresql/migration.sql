-- LedgerShield AI: Initial PostgreSQL Production Migration (0_init_postgresql)
-- Generated for PostgreSQL 14+ / Supabase / AWS RDS / Neon

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organization & Tenants
CREATE TABLE "Organization" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "legalName" VARCHAR(255),
    "gstin" VARCHAR(15),
    "pan" VARCHAR(10),
    "state" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "address" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_org_gstin" ON "Organization"("gstin");

-- 2. Users & Memberships
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255),
    "avatarUrl" TEXT,
    "department" VARCHAR(100),
    "designation" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_user_email" ON "User"("email");

CREATE TABLE "OrganizationMembership" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" VARCHAR(50) NOT NULL DEFAULT 'AP_OPERATOR',
    "approvalLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000.0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_user" UNIQUE ("organizationId", "userId")
);
CREATE INDEX "idx_membership_org" ON "OrganizationMembership"("organizationId");
CREATE INDEX "idx_membership_user" ON "OrganizationMembership"("userId");

-- 3. Suppliers & Bank Details
CREATE TABLE "Supplier" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "vendorCode" VARCHAR(50) NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "tradeName" VARCHAR(255),
    "gstin" VARCHAR(15),
    "pan" VARCHAR(10),
    "stateCode" VARCHAR(10),
    "address" TEXT,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isSuspended" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_vendorcode" UNIQUE ("organizationId", "vendorCode")
);
CREATE INDEX "idx_supplier_org" ON "Supplier"("organizationId");

CREATE TABLE "SupplierBankAccount" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "bankName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(100) NOT NULL,
    "ifscCode" VARCHAR(20) NOT NULL,
    "branchName" VARCHAR(255),
    "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "lastChangedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_supplier_bank" ON "SupplierBankAccount"("supplierId");

-- 4. Purchase Orders
CREATE TABLE "PurchaseOrder" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "poNumber" VARCHAR(100) NOT NULL,
    "poDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "deliveryDate" TIMESTAMP WITH TIME ZONE,
    "paymentTerms" VARCHAR(100),
    "createdBy" VARCHAR(255),
    "approvedBy" VARCHAR(255),
    "approvalDate" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_ponumber" UNIQUE ("organizationId", "poNumber")
);
CREATE INDEX "idx_po_org" ON "PurchaseOrder"("organizationId");

CREATE TABLE "PurchaseOrderLine" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "purchaseOrderId" UUID NOT NULL REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
    "lineNumber" INTEGER NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "sku" VARCHAR(100),
    "hsnCode" VARCHAR(20),
    "orderedQuantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lineTotal" DOUBLE PRECISION NOT NULL
);
CREATE INDEX "idx_poline_po" ON "PurchaseOrderLine"("purchaseOrderId");

-- 5. Invoices
CREATE TABLE "Invoice" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "purchaseOrderId" UUID REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL,
    "invoiceNumber" VARCHAR(100) NOT NULL,
    "invoiceDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "dueDate" TIMESTAMP WITH TIME ZONE,
    "documentType" VARCHAR(50) NOT NULL DEFAULT 'TAX_INVOICE',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalTaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "placeOfSupply" VARCHAR(100),
    "supplierGstin" VARCHAR(15),
    "buyerGstin" VARCHAR(15),
    "pdfFileUrl" TEXT,
    "ocrConfidence" DOUBLE PRECISION DEFAULT 1.0,
    "sourceDocumentId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_sup_inv" UNIQUE ("organizationId", "supplierId", "invoiceNumber")
);
CREATE INDEX "idx_invoice_org" ON "Invoice"("organizationId");

CREATE TABLE "InvoiceLine" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoiceId" UUID NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "poLineId" UUID REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "sku" VARCHAR(100),
    "hsnCode" VARCHAR(20),
    "billedQuantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lineTotal" DOUBLE PRECISION NOT NULL
);
CREATE INDEX "idx_invline_inv" ON "InvoiceLine"("invoiceId");

-- 6. Goods Receipts & Challans
CREATE TABLE "GoodsReceipt" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "purchaseOrderId" UUID REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL,
    "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE SET NULL,
    "grnNumber" VARCHAR(100) NOT NULL,
    "grnDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "challanNumber" VARCHAR(100),
    "receivedBy" VARCHAR(255),
    "warehouseLocation" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    "remarks" TEXT,
    "sourceDocumentId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_grn" UNIQUE ("organizationId", "grnNumber")
);
CREATE INDEX "idx_grn_org" ON "GoodsReceipt"("organizationId");

CREATE TABLE "GoodsReceiptLine" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "goodsReceiptId" UUID NOT NULL REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE,
    "poLineId" UUID REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "receivedQuantity" DOUBLE PRECISION NOT NULL,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL,
    "rejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unitOfMeasure" VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "rejectionReason" TEXT
);

-- 7. Payments & Credit Notes
CREATE TABLE "Payment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "paymentReference" VARCHAR(100) NOT NULL,
    "paymentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" VARCHAR(50) NOT NULL DEFAULT 'NEFT',
    "bankAccountRef" VARCHAR(100),
    "beneficiaryAccount" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'SETTLED',
    "initiatedBy" VARCHAR(255),
    "approvedBy" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_pmtref" UNIQUE ("organizationId", "paymentReference")
);

CREATE TABLE "PaymentAllocation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "paymentId" UUID NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE,
    "invoiceId" UUID NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "allocatedAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CreditNote" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "supplierId" UUID NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE,
    "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE SET NULL,
    "creditNoteNumber" VARCHAR(100) NOT NULL,
    "creditDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "isApplied" BOOLEAN NOT NULL DEFAULT FALSE,
    "appliedToInvoiceId" UUID,
    "sourceDocumentId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_sup_cn" UNIQUE ("organizationId", "supplierId", "creditNoteNumber")
);

-- 8. Uploaded Documents
CREATE TABLE "UploadedDocument" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "filename" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHashSha256" VARCHAR(64) NOT NULL,
    "documentType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PARSED',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "uploadedBy" VARCHAR(255),
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_doc_org_hash" ON "UploadedDocument"("organizationId", "fileHashSha256");

CREATE TABLE "ExtractedField" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "documentId" UUID NOT NULL REFERENCES "UploadedDocument"("id") ON DELETE CASCADE,
    "fieldName" VARCHAR(100) NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "boundingBoxJson" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "correctedValue" TEXT
);

-- 9. Findings & Evidence
CREATE TABLE "ReconciliationRun" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "runType" VARCHAR(50) NOT NULL DEFAULT 'FULL_BATCH',
    "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "totalExposure" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "summaryJson" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DiscrepancyFinding" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "reconciliationRunId" UUID REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL,
    "supplierId" UUID REFERENCES "Supplier"("id") ON DELETE SET NULL,
    "purchaseOrderId" UUID REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL,
    "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE SET NULL,
    "goodsReceiptId" UUID REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL,
    "paymentId" UUID REFERENCES "Payment"("id") ON DELETE SET NULL,
    "creditNoteId" UUID REFERENCES "CreditNote"("id") ON DELETE SET NULL,
    "poNumber" VARCHAR(100),
    "invoiceNumber" VARCHAR(100),
    "findingCode" VARCHAR(50) NOT NULL,
    "ruleId" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "grossDiscrepancy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unpaidDisputedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "potentialOverpayment" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "potentialRecoverable" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confirmedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "exposureGroupId" VARCHAR(100),
    "financialImpactScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "anomalyConfidence" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "fraudSuspicionScore" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "compositeRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 45.0,
    "expectedValue" TEXT,
    "observedValue" TEXT,
    "varianceCalculation" TEXT,
    "recommendedAction" TEXT,
    "assignedToUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "assignedAuditorName" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_findingcode" UNIQUE ("organizationId", "findingCode")
);
CREATE INDEX "idx_finding_org_cat" ON "DiscrepancyFinding"("organizationId", "category");
CREATE INDEX "idx_finding_org_sev" ON "DiscrepancyFinding"("organizationId", "severity");
CREATE INDEX "idx_finding_org_stat" ON "DiscrepancyFinding"("organizationId", "status");

CREATE TABLE "FindingEvidence" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "findingId" UUID NOT NULL REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE,
    "documentType" VARCHAR(50) NOT NULL,
    "documentNumber" VARCHAR(100) NOT NULL,
    "documentDate" TIMESTAMP WITH TIME ZONE,
    "sourceField" VARCHAR(100),
    "sourceValue" TEXT,
    "pageNumber" INTEGER,
    "fileReference" TEXT,
    "isContradicting" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RiskSignal" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "findingId" UUID NOT NULL REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE,
    "signalType" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Investigation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "findingId" UUID NOT NULL REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE,
    "queryText" TEXT NOT NULL,
    "aiResponseText" TEXT NOT NULL,
    "factsIdentified" TEXT,
    "hypothesesGiven" TEXT,
    "neutralSupplierDraft" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReviewerComment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "findingId" UUID NOT NULL REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE,
    "userId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "authorName" VARCHAR(255) NOT NULL,
    "commentText" TEXT NOT NULL,
    "previousStatus" VARCHAR(30),
    "newStatus" VARCHAR(30),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RecoveryRecord" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "findingId" UUID NOT NULL REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE,
    "recoveredAmount" DOUBLE PRECISION NOT NULL,
    "recoveryMethod" VARCHAR(50) NOT NULL,
    "recoveryReference" VARCHAR(100) NOT NULL,
    "recoveredDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Rules & Audit
CREATE TABLE "RuleConfiguration" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "ruleKey" VARCHAR(100) NOT NULL,
    "ruleName" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "valueString" VARCHAR(100) NOT NULL,
    "valueFloat" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" VARCHAR(255),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_org_rulekey" UNIQUE ("organizationId", "ruleKey")
);

CREATE TABLE "AuditEvent" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
    "userId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "userName" VARCHAR(255),
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(100) NOT NULL,
    "detailsJson" TEXT,
    "ipAddress" VARCHAR(50),
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_audit_org_time" ON "AuditEvent"("organizationId", "timestamp");
