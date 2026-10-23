import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { readDocumentFile, getPresignedDownloadUrl } from "@/lib/documents/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);

    const doc = await prisma.uploadedDocument.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId, // Strict Tenant Scoping
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
    }

    // 1. If S3 storage is enabled, generate a short-lived private signed URL
    const signedUrl = await getPresignedDownloadUrl(session.organizationId, doc.storagePath, 900);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    // 2. Local filesystem streaming download with tenant isolation
    const fileBuffer = await readDocumentFile(session.organizationId, doc.storagePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filename)}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
