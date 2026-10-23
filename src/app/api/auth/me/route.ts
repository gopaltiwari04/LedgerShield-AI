import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const activeMembership = user.memberships.find((m) => m.organizationId === session.organizationId) || user.memberships[0];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        designation: user.designation,
      },
      activeOrganization: {
        id: activeMembership.organization.id,
        name: activeMembership.organization.name,
        currency: activeMembership.organization.currency,
        gstin: activeMembership.organization.gstin,
        pan: activeMembership.organization.pan,
        state: activeMembership.organization.state,
      },
      role: activeMembership.role,
      approvalLimit: activeMembership.approvalLimit,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        approvalLimit: m.approvalLimit,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
