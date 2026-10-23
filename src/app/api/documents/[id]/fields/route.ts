import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { fieldId, correctedValue } = body;

    if (!fieldId || correctedValue === undefined) {
      return NextResponse.json({ error: "fieldId and correctedValue are required." }, { status: 400 });
    }

    // Verify document belongs to tenant
    const doc = await prisma.uploadedDocument.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
    }

    const updatedField = await prisma.extractedField.update({
      where: { id: fieldId },
      data: {
        correctedValue: String(correctedValue).trim(),
        isVerified: true,
      },
    });

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        userName: session.name,
        action: "DOCUMENT_FIELD_CORRECTED",
        resourceType: "EXTRACTED_FIELD",
        resourceId: fieldId,
        detailsJson: JSON.stringify({
          documentId: doc.id,
          fieldName: updatedField.fieldName,
          originalValue: updatedField.fieldValue,
          correctedValue: updatedField.correctedValue,
        }),
      },
    });

    return NextResponse.json({ success: true, field: updatedField });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
