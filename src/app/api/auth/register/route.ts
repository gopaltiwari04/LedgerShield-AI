import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationName, currency, gstin, state } = body;

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Name, email, password, and organization name are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.passwordHash) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create User, Organization, and Membership in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            email: cleanEmail,
            name: name.trim(),
            passwordHash,
            department: "Executive Management",
            designation: "Administrator",
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: name.trim(),
            passwordHash,
          },
        });
      }

      // Create new tenant organization
      const org = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          legalName: organizationName.trim(),
          currency: currency || "INR",
          gstin: gstin?.trim() || null,
          state: state?.trim() || null,
        },
      });

      // Assign user as ADMIN of this organization
      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "ADMIN",
          approvalLimit: 1000000.0,
        },
      });

      // Initialize default rule configurations for the organization
      await tx.ruleConfiguration.createMany({
        data: [
          {
            organizationId: org.id,
            ruleKey: "PRICE_TOLERANCE_PCT",
            ruleName: "Unit Price Variance Tolerance",
            description: "Maximum allowable percentage variance between PO unit rate and Invoice unit rate",
            category: "PRICE",
            valueString: "0.5%",
            valueFloat: 0.5,
            versionNumber: 1,
          },
          {
            organizationId: org.id,
            ruleKey: "QTY_TOLERANCE_PCT",
            ruleName: "Quantity Shortage Tolerance",
            description: "Allowable discrepancy between billed units and physically accepted units",
            category: "QUANTITY",
            valueString: "0.0%",
            valueFloat: 0.0,
            versionNumber: 1,
          },
          {
            organizationId: org.id,
            ruleKey: "APPROVAL_LIMIT_INR",
            ruleName: "Dual-Signoff Approval Ceiling",
            description: "Threshold above which purchases require dual management approval",
            category: "APPROVAL",
            valueString: "₹50,000",
            valueFloat: 50000.0,
            versionNumber: 1,
          },
          {
            organizationId: org.id,
            ruleKey: "DUPLICATE_WINDOW_DAYS",
            ruleName: "Duplicate Lookback Window",
            description: "Lookback period in days for matching duplicate invoice numbers or amounts",
            category: "DUPLICATE",
            valueString: "60 days",
            valueFloat: 60.0,
            versionNumber: 1,
          },
        ],
      });

      // Audit Event
      await tx.auditEvent.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          userName: user.name,
          action: "ORGANIZATION_CREATED",
          resourceType: "ORGANIZATION",
          resourceId: org.id,
          detailsJson: JSON.stringify({ name: org.name, currency: org.currency }),
        },
      });

      return { user, org, membership };
    });

    // Create session token
    const token = await createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.org.id,
      organizationName: result.org.name,
      role: "ADMIN",
      approvalLimit: result.membership.approvalLimit,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        currency: result.org.currency,
      },
      role: "ADMIN",
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}
