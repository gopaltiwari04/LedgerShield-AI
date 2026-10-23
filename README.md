# LedgerShield AI — B2B Financial Leakage & Procurement Fraud Investigation Platform

**LedgerShield AI** is an enterprise-grade, multi-tenant B2B accounts-payable reconciliation and procurement integrity SaaS platform. It protects Indian enterprises from financial leakage, unapplied supplier credits, duplicate payments, price variances, quantity shortfalls, and procurement integrity anomalies.

---

## 1. Core Architecture & Capabilities

1. **Deterministic 3-Way & 4-Way Reconciliation Engine (`src/lib/reconciliation/engine.ts`)**:
   - Reconciles Purchase Orders (POs), Supplier Invoices, Goods Receipt Notes (GRNs), Supplier Statements, and Bank Payments.
   - **Scenario A through J Benchmark**: Accurately detects price overcharges, quantity under-deliveries, duplicate payments, unapplied credit notes, invoice splitting beneath approval tiers, and shared vendor bank accounts.
   - **Double-Count Prevention**: Groups linked discrepancies under shared `exposureGroupId` identifiers so net unique financial exposure is never artificially inflated.
   - **Integer Minor Currency Units (Paise) Exact Arithmetic (`src/lib/currency.ts`)**: Authoritative financial calculations use paise integers to prevent IEEE-754 binary floating-point rounding errors.

2. **Google Gemini Generative AI Investigation Assistant (`src/lib/ai/gemini.ts`)**:
   - Server-side generative AI integration powered by the official `@google/genai` SDK with `gemini-2.5-flash`.
   - **Strict Grounding**: Financial figures, variance calculations, and document references are provided as authoritative deterministic facts that Gemini cannot override.
   - **Multi-Perspective Audit Breakdown**: Distinguishes verified documentary facts from plausible innocent business hypotheses and recommended auditor actions.
   - **Supplier Clarification Drafts**: Automatically composes neutral, non-accusatory clarification emails requesting delivery challans or ledger statements.
   - **Prompt Injection Defense**: Sanitizes input to neutralize prompt injection directives embedded in uploaded documents or user queries.
   - **Safe Offline Fallback**: Operates cleanly with deterministic audit rules when `GEMINI_API_KEY` is not configured, providing an honest unconfigured state without faking AI responses.

3. **Universal Document Ingestion & Storage Abstraction (`src/lib/documents/`)**:
   - Supports **CSV, TSV, XLSX, XLS, JSON, and text-based PDFs**.
   - Computes cryptographic **SHA-256 binary checksums** to reject duplicate document uploads.
   - Server-enforced **25 MB file upload limit** and MIME validation.
   - **Storage Abstraction (`storage.ts`)**: Seamlessly supports both local filesystem development storage (`./uploads/{organizationId}`) and private **AWS S3 / Cloudflare R2** object storage with authenticated streaming downloads and short-lived signed URLs.

4. **Security, Multi-Tenancy & Governance**:
   - **Tamper-Evident Authentication**: Password hashing with bcrypt (12 salt rounds), tamper-evident JWT sessions via `jose` with HTTP-only cookies and `Authorization: Bearer <token>` support.
   - **Strict Multi-Tenant Isolation**: Edge middleware and database-level ownership scoping on every query, preventing Insecure Direct Object Reference (IDOR) attacks.
   - **Maker-Checker & Governance Ceilings**: Enforces approval ceilings (`INTERNAL_AUDITOR` up to ₹1,00,000; `FINANCE_MANAGER` up to ₹10,00,000; `ADMIN` unlimited).
   - **Mandatory Recovery Validation**: Prohibits marking findings as recovered without recording valid positive recovery amounts, recovery methods, and references.
   - **Account Lifecycle & Transactional Email (`src/lib/email/service.ts`)**: Expiring single-use password reset tokens (hashed with SHA-256), email verification, and organization team invitations.

---

## 2. Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- npm 9+

### Installation & Initialization
```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to SQLite development database
npx prisma db push

# 3. Seed demonstration organizations and scenarios
npx tsx src/lib/seed/seed-db.ts

# 4. Run the automated test suite (44 tests across 9 suites)
npm test

# 5. Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 3. Environment Configuration (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key configuration options:
```env
# Database
DATABASE_URL="file:./dev.db"

# Google Gemini API Configuration (Mandatory AI Provider)
# Obtain key at: https://aistudio.google.com/
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"

# Document Storage Driver ("local" | "s3")
STORAGE_DRIVER="local"
LOCAL_STORAGE_DIR="./uploads"

# S3 / Cloudflare R2 Settings (if STORAGE_DRIVER="s3")
# S3_ENDPOINT=""
# S3_REGION="ap-south-1"
# S3_BUCKET_NAME="ledgershield-documents"
# S3_ACCESS_KEY_ID=""
# S3_SECRET_ACCESS_KEY=""

# Transactional Email Provider ("mock" | "resend" | "smtp")
EMAIL_PROVIDER="mock"
RESEND_API_KEY=""
EMAIL_FROM="noreply@ledgershield.ai"

# Authentication Secret (Minimum 32 characters)
AUTH_SECRET="dev-insecure-secret-key-change-in-production-min-32-chars"
```

---

## 4. Google Gemini API Setup Instructions

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and generate a new key for your project.
4. Add the key to your `.env` or hosting environment variables:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   GEMINI_MODEL="gemini-2.5-flash"
   ```
5. When `GEMINI_API_KEY` is present, the AI Investigation Assistant on findings and reports uses live Google Gemini structured reasoning. If omitted, the platform automatically operates in deterministic audit rule fallback mode.

---

## 5. Production PostgreSQL Migration & Deployment

### Step 1: PostgreSQL Schema Migration
LedgerShield includes a production-ready PostgreSQL Prisma schema with UUID primary keys and database indexes:
```bash
# Apply migrations to production PostgreSQL database
npx prisma migrate deploy --schema=./prisma/schema.postgresql.prisma

# Generate Prisma Client for PostgreSQL
npx prisma generate --schema=./prisma/schema.postgresql.prisma
```

### Step 2: Production Build & Start
```bash
# Compile optimized Next.js production build
npm run build

# Start production server
npx next start -p 3005
```

### Step 3: Health Verification
```bash
curl http://localhost:3005/api/health
# Returns: {"status":"ok","uptimeSeconds":...,"version":"0.2.0","environment":"production","services":{"database":"connected","storage":"ready"}}
```

---

## 6. Automated Test Suite Summary

Run all 44 automated tests:
```bash
npm test
```

| Test Suite | File | Tests | Coverage |
| :--- | :--- | :---: | :--- |
| **Account Lifecycle & Reset** | `src/tests/auth-account-lifecycle.test.ts` | 5 | Token hashing, single-use reset, expiration, invitations, account deactivation |
| **Authentication & Sessions** | `src/tests/auth.test.ts` | 4 | Bcrypt hashing, salt checks, tamper-evident JWTs, token tampering rejection |
| **Document Pipeline** | `src/tests/document-pipeline.test.ts` | 4 | SHA-256 hashing, 25MB limit, CSV invoice parsing, field correction audit logs |
| **Financial Arithmetic** | `src/tests/exact-financial-arithmetic.test.ts` | 5 | Exact paise math (zero float drift), INR Lakh/Crore formats, CGST/SGST/IGST, GSTIN |
| **Google Gemini & Safety** | `src/tests/gemini.test.ts` | 4 | Unconfigured fallback, prompt injection defense, batch summary, structured outputs |
| **Multi-Tenant Security** | `src/tests/multi-tenant.test.ts` | 4 | Cross-tenant read/write isolation, IDOR defense, download authorization |
| **Reconciliation Engine** | `src/tests/reconciliation.test.ts` | 10 | Scenarios A–J (overcharge, shortfall, duplicate payment, unapplied credit, etc.) |
| **Spreadsheets & Storage** | `src/tests/storage-and-parser.test.ts` | 3 | Multi-row XLSX parsing, TSV parsing, tenant directory isolation & path traversal defense |
| **End-to-End User Journeys**| `src/tests/user-journeys.test.ts` | 5 | Registration $\to$ Ingestion $\to$ Reconciliation $\to$ Maker-checker $\to$ Dashboard KPIs |
| **Total** | | **44** | **100% Pass Rate** |
