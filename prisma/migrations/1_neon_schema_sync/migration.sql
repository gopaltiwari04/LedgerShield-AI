-- LedgerShield AI: Neon PostgreSQL Forward-Only Migration (1_neon_schema_sync)
-- Safely synchronizes missing tables, columns, constraints, and indexes without dropping existing data.

-- Ensure UUID generation extension is active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Alter Table "User" to add missing account lifecycle & status columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP WITH TIME ZONE;

-- 2. Adjust role column default on OrganizationMembership to align with Prisma schema
ALTER TABLE "OrganizationMembership" ALTER COLUMN "role" DROP DEFAULT;

-- 3. Create Table "PasswordResetToken" for secure single-use password resets
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "usedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- 4. Create Table "EmailVerificationToken" for account email verification
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "verifiedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- 5. Create Table "OrganizationInvitation" for team invitations
CREATE TABLE IF NOT EXISTS "OrganizationInvitation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL_AUDITOR',
    "approvalLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000.0,
    "tokenHash" VARCHAR(255) NOT NULL,
    "invitedById" UUID,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "acceptedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_tokenHash_idx" ON "OrganizationInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_organizationId_email_idx" ON "OrganizationInvitation"("organizationId", "email");

-- 6. Create Table "PurchaseOrderAmendment" for approved PO rate/quantity amendments
CREATE TABLE IF NOT EXISTS "PurchaseOrderAmendment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "purchaseOrderId" UUID NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "amendmentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "reason" TEXT NOT NULL,
    "previousAmount" DOUBLE PRECISION NOT NULL,
    "newAmount" DOUBLE PRECISION NOT NULL,
    "approvedBy" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderAmendment_purchaseOrderId_idx" ON "PurchaseOrderAmendment"("purchaseOrderId");

-- 7. Create Table "DeliveryChallan" for physical goods receipt and logistics reconciliation
CREATE TABLE IF NOT EXISTS "DeliveryChallan" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "challanNumber" VARCHAR(100) NOT NULL,
    "challanDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "vehicleNumber" VARCHAR(50),
    "transporterName" VARCHAR(255),
    "poReference" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryChallan_organizationId_challanNumber_key" ON "DeliveryChallan"("organizationId", "challanNumber");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_organizationId_idx" ON "DeliveryChallan"("organizationId");

-- 8. Create Table "DebitNote" for supplier debit recovery tracking
CREATE TABLE IF NOT EXISTS "DebitNote" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "debitNoteNumber" VARCHAR(100) NOT NULL,
    "debitDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DebitNote_organizationId_supplierId_debitNoteNumber_key" ON "DebitNote"("organizationId", "supplierId", "debitNoteNumber");
CREATE INDEX IF NOT EXISTS "DebitNote_organizationId_idx" ON "DebitNote"("organizationId");

-- 9. Create Table "SupplierStatement" for monthly AP ledger reconciliation
CREATE TABLE IF NOT EXISTS "SupplierStatement" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "statementDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
    "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION NOT NULL,
    "calculatedBalance" DOUBLE PRECISION,
    "status" VARCHAR(50) NOT NULL DEFAULT 'UNRECONCILED',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SupplierStatement_organizationId_idx" ON "SupplierStatement"("organizationId");

-- 10. Create Table "SupplierStatementEntry" for statement line items
CREATE TABLE IF NOT EXISTS "SupplierStatementEntry" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "supplierStatementId" UUID NOT NULL,
    "entryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "referenceNumber" VARCHAR(100) NOT NULL,
    "documentType" VARCHAR(50) NOT NULL,
    "debitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "runningBalance" DOUBLE PRECISION,
    "isMatchedInternal" BOOLEAN NOT NULL DEFAULT false,
    "matchedInternalRef" VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS "SupplierStatementEntry_supplierStatementId_idx" ON "SupplierStatementEntry"("supplierStatementId");

-- 11. Create Table "Approval" for maker-checker audit sign-offs
CREATE TABLE IF NOT EXISTS "Approval" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "findingId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "actionTaken" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Approval_findingId_idx" ON "Approval"("findingId");

-- 12. Add Missing Indexes on Existing Tables for High-Performance Queries
CREATE INDEX IF NOT EXISTS "Supplier_gstin_idx" ON "Supplier"("gstin");
CREATE INDEX IF NOT EXISTS "SupplierBankAccount_accountNumber_idx" ON "SupplierBankAccount"("accountNumber");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "Invoice_supplierId_idx" ON "Invoice"("supplierId");
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "GoodsReceiptLine_goodsReceiptId_idx" ON "GoodsReceiptLine"("goodsReceiptId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_invoiceId_idx" ON "PaymentAllocation"("invoiceId");
CREATE INDEX IF NOT EXISTS "CreditNote_organizationId_idx" ON "CreditNote"("organizationId");
CREATE INDEX IF NOT EXISTS "UploadedDocument_organizationId_idx" ON "UploadedDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "UploadedDocument_fileHashSha256_idx" ON "UploadedDocument"("fileHashSha256");
CREATE INDEX IF NOT EXISTS "ExtractedField_documentId_idx" ON "ExtractedField"("documentId");
CREATE INDEX IF NOT EXISTS "ReconciliationRun_organizationId_idx" ON "ReconciliationRun"("organizationId");
CREATE INDEX IF NOT EXISTS "DiscrepancyFinding_organizationId_idx" ON "DiscrepancyFinding"("organizationId");
CREATE INDEX IF NOT EXISTS "DiscrepancyFinding_category_idx" ON "DiscrepancyFinding"("category");
CREATE INDEX IF NOT EXISTS "DiscrepancyFinding_severity_idx" ON "DiscrepancyFinding"("severity");
CREATE INDEX IF NOT EXISTS "DiscrepancyFinding_status_idx" ON "DiscrepancyFinding"("status");
CREATE INDEX IF NOT EXISTS "FindingEvidence_findingId_idx" ON "FindingEvidence"("findingId");
CREATE INDEX IF NOT EXISTS "RiskSignal_findingId_idx" ON "RiskSignal"("findingId");
CREATE INDEX IF NOT EXISTS "Investigation_organizationId_idx" ON "Investigation"("organizationId");
CREATE INDEX IF NOT EXISTS "Investigation_findingId_idx" ON "Investigation"("findingId");
CREATE INDEX IF NOT EXISTS "ReviewerComment_findingId_idx" ON "ReviewerComment"("findingId");
CREATE INDEX IF NOT EXISTS "RecoveryRecord_organizationId_idx" ON "RecoveryRecord"("organizationId");
CREATE INDEX IF NOT EXISTS "RecoveryRecord_findingId_idx" ON "RecoveryRecord"("findingId");
CREATE INDEX IF NOT EXISTS "RuleConfiguration_organizationId_idx" ON "RuleConfiguration"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditEvent_organizationId_idx" ON "AuditEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");

-- 13. Add Foreign Key Constraints with Idempotent Guards
DO $$ BEGIN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PurchaseOrderAmendment" ADD CONSTRAINT "PurchaseOrderAmendment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SupplierStatement" ADD CONSTRAINT "SupplierStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SupplierStatement" ADD CONSTRAINT "SupplierStatement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SupplierStatementEntry" ADD CONSTRAINT "SupplierStatementEntry_supplierStatementId_fkey" FOREIGN KEY ("supplierStatementId") REFERENCES "SupplierStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Approval" ADD CONSTRAINT "Approval_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "DiscrepancyFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 14. Align Index Names to Prisma Standards
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_org_gstin" RENAME TO "Organization_gstin_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_user_email" RENAME TO "User_email_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_membership_org" RENAME TO "OrganizationMembership_organizationId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_membership_user" RENAME TO "OrganizationMembership_userId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_user" RENAME TO "OrganizationMembership_organizationId_userId_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_supplier_org" RENAME TO "Supplier_organizationId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_vendorcode" RENAME TO "Supplier_organizationId_vendorCode_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_supplier_bank" RENAME TO "SupplierBankAccount_supplierId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_po_org" RENAME TO "PurchaseOrder_organizationId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_ponumber" RENAME TO "PurchaseOrder_organizationId_poNumber_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_poline_po" RENAME TO "PurchaseOrderLine_purchaseOrderId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_invoice_org" RENAME TO "Invoice_organizationId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_sup_inv" RENAME TO "Invoice_organizationId_supplierId_invoiceNumber_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_invline_inv" RENAME TO "InvoiceLine_invoiceId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "idx_grn_org" RENAME TO "GoodsReceipt_organizationId_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_grn" RENAME TO "GoodsReceipt_organizationId_grnNumber_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_pmtref" RENAME TO "Payment_organizationId_paymentReference_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_sup_cn" RENAME TO "CreditNote_organizationId_supplierId_creditNoteNumber_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_findingcode" RENAME TO "DiscrepancyFinding_organizationId_findingCode_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX IF EXISTS "uq_org_rulekey" RENAME TO "RuleConfiguration_organizationId_ruleKey_key"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
