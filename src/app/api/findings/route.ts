import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const supplierId = searchParams.get("supplierId");
    const sortBy = searchParams.get("sortBy") || "risk"; // "risk" | "exposure" | "date"
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: session.organizationId,
    };

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (severity && severity !== "ALL") {
      where.severity = severity;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (supplierId && supplierId !== "ALL") {
      where.supplierId = supplierId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { findingCode: { contains: search } },
        { invoiceNumber: { contains: search } },
        { poNumber: { contains: search } },
      ];
    }

    let orderBy: any = [{ compositeRiskScore: "desc" }, { createdAt: "desc" }];
    if (sortBy === "exposure") {
      orderBy = [{ grossDiscrepancy: sortOrder }];
    } else if (sortBy === "date") {
      orderBy = [{ createdAt: sortOrder }];
    } else if (sortBy === "risk") {
      orderBy = [{ compositeRiskScore: sortOrder }];
    }

    const [findings, totalCount] = await Promise.all([
      prisma.discrepancyFinding.findMany({
        where,
        include: {
          supplier: true,
          evidences: true,
          riskSignals: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.discrepancyFinding.count({ where }),
    ]);

    return NextResponse.json({
      findings,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
