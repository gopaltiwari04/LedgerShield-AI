import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);

    const finding = await prisma.discrepancyFinding.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId, // Strict Tenant Scoping (IDOR Prevention)
      },
      include: {
        supplier: {
          include: { bankAccounts: true },
        },
        evidences: true,
        riskSignals: true,
        comments: {
          orderBy: { createdAt: "desc" },
        },
        recoveries: true,
      },
    });

    if (!finding) {
      return NextResponse.json(
        { error: "Finding not found or access denied." },
        { status: 404 }
      );
    }

    let relatedPo = null;
    let relatedInvoice = null;

    if (finding.poNumber) {
      relatedPo = await prisma.purchaseOrder.findFirst({
        where: {
          poNumber: finding.poNumber,
          organizationId: session.organizationId,
        },
        include: { lines: true, amendments: true },
      });
    }

    if (finding.invoiceNumber) {
      relatedInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: finding.invoiceNumber,
          organizationId: session.organizationId,
        },
        include: { lines: true },
      });
    }

    return NextResponse.json({
      finding,
      relatedPo,
      relatedInvoice,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { status, comment, confirmedAmount, recoveredAmount } = body;

    const existing = await prisma.discrepancyFinding.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId, // Strict Tenant Scoping
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Finding not found or access denied." },
        { status: 404 }
      );
    }

    // Maker-Checker & Dual Approval Enforcement
    const targetAmount = confirmedAmount !== undefined ? Number(confirmedAmount) : existing.confirmedAmount;
    if (status === "CONFIRMED" || status === "RECOVERED") {
      if (session.approvalLimit > 0 && targetAmount > session.approvalLimit) {
        if (session.role !== "ADMIN" && session.role !== "FINANCE_MANAGER") {
          return NextResponse.json(
            {
              error: `Dual Approval Required: Amount (₹${targetAmount.toFixed(2)}) exceeds your single-approval limit (₹${session.approvalLimit.toFixed(2)}). An Admin or Finance Manager must confirm this action.`,
            },
            { status: 403 }
          );
        }
      }
    }

    // Recovery validation: recovery amount and supporting reference are required
    const recAmt = recoveredAmount !== undefined ? Number(recoveredAmount) : existing.recoveredAmount;
    if (status === "RECOVERED") {
      if (!recAmt || recAmt <= 0) {
        return NextResponse.json(
          {
            error: "A positive recovery amount is mandatory to transition a finding to RECOVERED status.",
          },
          { status: 400 }
        );
      }
    }

    // Dismissal justification validation
    if (status === "DISMISSED") {
      if (!comment || comment.trim().length < 5) {
        return NextResponse.json(
          {
            error: "A valid business justification reason is mandatory when dismissing a finding.",
          },
          { status: 400 }
        );
      }
    }

    const { recoveryMethod, recoveryReference, newEvidence, assignedToUserId, assignedAuditorName } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const f = await tx.discrepancyFinding.update({
        where: { id: existing.id },
        data: {
          status: status || existing.status,
          confirmedAmount: confirmedAmount !== undefined ? Number(confirmedAmount) : existing.confirmedAmount,
          recoveredAmount: recAmt,
          assignedToUserId: assignedToUserId !== undefined ? assignedToUserId : existing.assignedToUserId,
          assignedAuditorName: assignedAuditorName || session.name,
        },
        include: { evidences: true, riskSignals: true, comments: true, recoveries: true },
      });

      if (status === "RECOVERED" && recAmt > 0) {
        await tx.recoveryRecord.create({
          data: {
            organizationId: session.organizationId,
            findingId: existing.id,
            recoveredAmount: recAmt,
            recoveryMethod: recoveryMethod || "DEBIT_NOTE_SET_OFF",
            recoveryReference: recoveryReference || `REC-${existing.findingCode}-${Date.now()}`,
            recoveredDate: new Date(),
            notes: comment || "Discrepancy recovery recorded.",
          },
        });
      }

      if (newEvidence && Array.isArray(newEvidence)) {
        for (const ev of newEvidence) {
          await tx.findingEvidence.create({
            data: {
              findingId: existing.id,
              documentType: ev.documentType || "SUPPORTING_DOC",
              documentNumber: ev.documentNumber || "N/A",
              sourceField: ev.sourceField,
              sourceValue: ev.sourceValue,
            },
          });
        }
      }

      if (comment) {
        await tx.reviewerComment.create({
          data: {
            findingId: existing.id,
            userId: session.userId,
            authorName: `${session.name} (${session.role})`,
            commentText: comment.trim(),
            previousStatus: existing.status,
            newStatus: status || existing.status,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          userName: session.name,
          action: "FINDING_DISPOSITION_UPDATE",
          resourceType: "DISCREPANCY_FINDING",
          resourceId: existing.id,
          detailsJson: JSON.stringify({
            findingCode: existing.findingCode,
            previousStatus: existing.status,
            newStatus: status,
            confirmedAmount,
            recoveredAmount,
            auditorRole: session.role,
          }),
        },
      });

      return f;
    });

    return NextResponse.json({ success: true, finding: updated });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
