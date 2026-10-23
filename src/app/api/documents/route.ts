import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { saveDocumentFile } from "@/lib/documents/storage";
import { parseStructuredDocumentAsync } from "@/lib/documents/parser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("type");
    const status = searchParams.get("status");

    const where: any = {
      organizationId: session.organizationId, // Strict Tenant Scoping
    };

    if (documentType && documentType !== "ALL") where.documentType = documentType;
    if (status && status !== "ALL") where.status = status;

    const documents = await prisma.uploadedDocument.findMany({
      where,
      include: {
        extractedFields: {
          orderBy: { pageNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const contentType = req.headers.get("content-type") || "";

    let filename = "";
    let buffer: Buffer;
    let declaredType = "TAX_INVOICE";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const docTypeHint = (formData.get("documentType") as string) || "TAX_INVOICE";

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      filename = file.name;
      declaredType = docTypeHint;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload (API / programmatic upload)
      const body = await req.json();
      filename = body.filename || `upload-${Date.now()}.csv`;
      declaredType = body.documentType || "TAX_INVOICE";
      const rawText = body.rawText || body.content || "";
      buffer = Buffer.from(rawText, "utf-8");
    }

    if (!filename || buffer.length === 0) {
      return NextResponse.json({ error: "File content cannot be empty." }, { status: 400 });
    }

    // 1. Save file securely with SHA-256 hash
    const saved = await saveDocumentFile(
      session.organizationId,
      filename,
      buffer
    );

    // 2. Check for duplicate content within organizational scope
    const existing = await prisma.uploadedDocument.findFirst({
      where: {
        organizationId: session.organizationId,
        fileHashSha256: saved.fileHashSha256,
      },
    });

    const isDuplicate = !!existing;

    // 3. Parse fields deterministically across CSV, TSV, XLSX, JSON, and text PDFs
    const parsed = await parseStructuredDocumentAsync(filename, buffer, declaredType);

    // 4. Create persistent UploadedDocument record
    const doc = await prisma.uploadedDocument.create({
      data: {
        organizationId: session.organizationId,
        filename,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        storagePath: saved.storageKey,
        fileHashSha256: saved.fileHashSha256,
        documentType: parsed.documentType || declaredType,
        status: isDuplicate ? "DUPLICATE_FLAGGED" : "PARSED",
        confidenceScore: parsed.overallConfidence,
        uploadedBy: session.name,
        metadataJson: JSON.stringify({
          isDuplicate,
          duplicateOf: existing?.filename || null,
          invoiceNumber: parsed.invoiceNumber || null,
          poNumber: parsed.poNumber || null,
          totalAmount: parsed.totalAmount || null,
          validationWarnings: parsed.validationWarnings,
        }),
      },
    });

    // 5. Store extracted fields
    if (parsed.extractedFields && parsed.extractedFields.length > 0) {
      for (const f of parsed.extractedFields) {
        await prisma.extractedField.create({
          data: {
            documentId: doc.id,
            fieldName: f.name,
            fieldValue: f.value,
            confidence: f.confidence,
            pageNumber: 1,
            isVerified: true,
          },
        });
      }
    }

    // 6. Audit Event
    await prisma.auditEvent.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        userName: session.name,
        action: "DOCUMENT_UPLOADED",
        resourceType: "UPLOADED_DOCUMENT",
        resourceId: doc.id,
        detailsJson: JSON.stringify({
          filename,
          isDuplicate,
          sha256: saved.fileHashSha256,
          fileSize: saved.fileSize,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      document: doc,
      isDuplicate,
      warning: isDuplicate
        ? `Warning: This file matches the exact cryptographic hash of previously uploaded document "${existing?.filename}".`
        : null,
      parsedPreview: {
        invoiceNumber: parsed.invoiceNumber,
        poNumber: parsed.poNumber,
        totalAmount: parsed.totalAmount,
        linesCount: parsed.lines.length,
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
