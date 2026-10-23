import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    let rules = await prisma.ruleConfiguration.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { category: "asc" },
    });

    // If new org has no rules, initialize defaults
    if (rules.length === 0) {
      await prisma.ruleConfiguration.createMany({
        data: [
          {
            organizationId: session.organizationId,
            ruleKey: "PRICE_TOLERANCE_PCT",
            ruleName: "Unit Price Variance Tolerance",
            description: "Maximum allowable percentage variance between PO unit rate and Invoice unit rate",
            category: "PRICE",
            valueString: "0.5%",
            valueFloat: 0.5,
            versionNumber: 1,
            updatedBy: session.name,
          },
          {
            organizationId: session.organizationId,
            ruleKey: "QTY_TOLERANCE_PCT",
            ruleName: "Quantity Shortage Tolerance",
            description: "Allowable discrepancy between billed units and physically accepted units",
            category: "QUANTITY",
            valueString: "0.0%",
            valueFloat: 0.0,
            versionNumber: 1,
            updatedBy: session.name,
          },
          {
            organizationId: session.organizationId,
            ruleKey: "APPROVAL_LIMIT_INR",
            ruleName: "Dual-Signoff Approval Ceiling",
            description: "Threshold above which purchases require dual management approval",
            category: "APPROVAL",
            valueString: "₹50,000",
            valueFloat: 50000.0,
            versionNumber: 1,
            updatedBy: session.name,
          },
          {
            organizationId: session.organizationId,
            ruleKey: "DUPLICATE_WINDOW_DAYS",
            ruleName: "Duplicate Lookback Window",
            description: "Lookback period in days for matching duplicate invoice numbers or amounts",
            category: "DUPLICATE",
            valueString: "60 days",
            valueFloat: 60.0,
            versionNumber: 1,
            updatedBy: session.name,
          },
        ],
      });

      rules = await prisma.ruleConfiguration.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { category: "asc" },
      });
    }

    return NextResponse.json({ rules });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["ADMIN", "FINANCE_MANAGER"]);

    const body = await req.json();
    const { priceTolerancePct, quantityTolerancePct, approvalLimitINR, duplicateWindowDays } = body;

    const updates: Array<{ ruleKey: string; valueFloat: number; valueString: string }> = [];
    if (priceTolerancePct !== undefined) {
      updates.push({ ruleKey: "PRICE_TOLERANCE_PCT", valueFloat: Number(priceTolerancePct), valueString: `${priceTolerancePct}%` });
    }
    if (quantityTolerancePct !== undefined) {
      updates.push({ ruleKey: "QTY_TOLERANCE_PCT", valueFloat: Number(quantityTolerancePct), valueString: `${quantityTolerancePct}%` });
    }
    if (approvalLimitINR !== undefined) {
      updates.push({ ruleKey: "APPROVAL_LIMIT_INR", valueFloat: Number(approvalLimitINR), valueString: `₹${approvalLimitINR}` });
    }
    if (duplicateWindowDays !== undefined) {
      updates.push({ ruleKey: "DUPLICATE_WINDOW_DAYS", valueFloat: Number(duplicateWindowDays), valueString: `${duplicateWindowDays} days` });
    }

    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const existing = await tx.ruleConfiguration.findUnique({
          where: {
            organizationId_ruleKey: {
              organizationId: session.organizationId,
              ruleKey: u.ruleKey,
            },
          },
        });

        if (existing) {
          await tx.ruleConfiguration.update({
            where: { id: existing.id },
            data: {
              valueFloat: u.valueFloat,
              valueString: u.valueString,
              versionNumber: existing.versionNumber + 1, // Version rule configurations!
              updatedBy: session.name,
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          userName: session.name,
          action: "RULES_CONFIGURATION_UPDATED",
          resourceType: "RULE_CONFIGURATION",
          resourceId: session.organizationId,
          detailsJson: JSON.stringify(body),
        },
      });
    });

    const updatedRules = await prisma.ruleConfiguration.findMany({
      where: { organizationId: session.organizationId },
    });

    return NextResponse.json({
      success: true,
      message: "Control rules updated with new version numbers.",
      rules: updatedRules,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
