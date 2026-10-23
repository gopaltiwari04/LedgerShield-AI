import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { AIInvestigationService } from "@/lib/ai/assistant";
import { FindingItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { query } = body;

    const finding = await prisma.discrepancyFinding.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId, // Strict Tenant Scoping
      },
      include: {
        supplier: true,
        evidences: true,
        riskSignals: true,
      },
    });

    if (!finding) {
      return NextResponse.json(
        { error: "Finding not found or access denied." },
        { status: 404 }
      );
    }

    const findingItem: FindingItem = {
      id: finding.id,
      findingCode: finding.findingCode,
      ruleId: finding.ruleId,
      category: finding.category as any,
      severity: finding.severity as any,
      status: finding.status as any,
      title: finding.title,
      description: finding.description,
      supplierId: finding.supplierId || undefined,
      supplierName: finding.supplier?.legalName || undefined,
      vendorCode: finding.supplier?.vendorCode || undefined,
      poNumber: finding.poNumber || undefined,
      invoiceNumber: finding.invoiceNumber || undefined,
      creditNoteNumber: finding.creditNoteId || undefined,
      grossDiscrepancy: finding.grossDiscrepancy,
      amountPaid: finding.amountPaid,
      unpaidDisputedAmount: finding.unpaidDisputedAmount,
      potentialOverpayment: finding.potentialOverpayment,
      potentialRecoverable: finding.potentialRecoverable,
      confirmedAmount: finding.confirmedAmount,
      recoveredAmount: finding.recoveredAmount,
      exposureGroupId: finding.exposureGroupId || undefined,
      financialImpactScore: finding.financialImpactScore,
      anomalyConfidence: finding.anomalyConfidence,
      fraudSuspicionScore: finding.fraudSuspicionScore,
      compositeRiskScore: finding.compositeRiskScore,
      expectedValue: finding.expectedValue || "N/A",
      observedValue: finding.observedValue || "N/A",
      varianceCalculation: finding.varianceCalculation || "N/A",
      recommendedAction: finding.recommendedAction || "N/A",
      evidences: finding.evidences.map((e) => ({
        id: e.id,
        documentType: e.documentType,
        documentNumber: e.documentNumber,
        sourceField: e.sourceField || undefined,
        sourceValue: e.sourceValue || undefined,
      })),
      riskSignals: finding.riskSignals.map((r) => ({
        id: r.id,
        signalType: r.signalType,
        description: r.description,
        weight: r.weight,
      })),
      createdAt: finding.createdAt.toISOString(),
    };

    const result = await AIInvestigationService.investigateWithGemini(findingItem, query);

    await prisma.investigation.create({
      data: {
        organizationId: session.organizationId,
        findingId: finding.id,
        queryText: query || "AI Case Investigation",
        aiResponseText: result.answer,
        factsIdentified: JSON.stringify(result.verifiedFacts),
        hypothesesGiven: JSON.stringify(result.hypotheses),
        neutralSupplierDraft: result.supplierDraftEmail,
        confidenceScore: 0.95,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return handleAuthError(error);
  }
}
