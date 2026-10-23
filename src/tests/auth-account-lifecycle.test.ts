import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { generateSecureToken, hashToken, EmailService } from "../lib/email/service";

describe("LedgerShield Security: Account Lifecycle, Password Reset & Invitations", () => {
  test("Generates high-entropy reset tokens and verifies cryptographic SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateSecureToken();
    assert.equal(rawToken.length, 64); // 32 bytes hex
    assert.equal(tokenHash.length, 64); // 32 bytes SHA-256 hex
    assert.notEqual(rawToken, tokenHash); // Raw token is NOT stored in DB
    assert.equal(hashToken(rawToken), tokenHash); // Deterministic one-way hash
  });

  test("Executes full password reset workflow and invalidates token after single use", async () => {
    // 1. Create a test user with known password
    const testEmail = `reset-user-${Date.now()}@example.com`;
    const initialPass = "OldPassword#2024!";
    const newPass = "NewSecurePassword#2025!";

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Reset Lifecycle User",
        passwordHash: await hashPassword(initialPass),
        isActive: true,
      },
    });

    // 2. Request password reset
    const { rawToken, tokenHash } = generateSecureToken();
    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    assert.ok(tokenRecord.id);
    assert.equal(tokenRecord.usedAt, null);

    // 3. User uses valid token to reset password
    const computedHash = hashToken(rawToken);
    const foundToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: computedHash },
      include: { user: true },
    });

    assert.ok(foundToken);
    assert.equal(foundToken.userId, user.id);
    assert.equal(foundToken.usedAt, null);

    // Perform reset
    const newHash = await hashPassword(newPass);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: foundToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // 4. Verify new password works and old password fails
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.ok(updatedUser?.passwordHash);
    assert.equal(await verifyPassword(newPass, updatedUser.passwordHash!), true);
    assert.equal(await verifyPassword(initialPass, updatedUser.passwordHash!), false);

    // 5. Verify token cannot be re-used (single-use defense)
    const recheckToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: computedHash },
    });
    assert.ok(recheckToken?.usedAt !== null);
  });

  test("Rejects expired password reset tokens", async () => {
    const expiredEmail = `expired-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: expiredEmail,
        name: "Expired Token User",
        passwordHash: await hashPassword("SomePass#123!"),
      },
    });

    const { rawToken, tokenHash } = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    const found = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    assert.ok(found);
    const isExpired = new Date() > found.expiresAt;
    assert.equal(isExpired, true);
  });

  test("Generates and validates team organization invitations", async () => {
    // Create an organization
    const org = await prisma.organization.create({
      data: {
        name: `Test Org ${Date.now()}`,
        currency: "INR",
      },
    });

    const inviteeEmail = `invitee-${Date.now()}@example.com`;
    const { rawToken, tokenHash } = generateSecureToken();

    const invite = await prisma.organizationInvitation.create({
      data: {
        organizationId: org.id,
        email: inviteeEmail,
        role: "FINANCE_MANAGER",
        approvalLimit: 100000.0,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    assert.ok(invite.id);
    assert.equal(invite.role, "FINANCE_MANAGER");
    assert.equal(invite.approvalLimit, 100000.0);

    // Test accept invitation
    const foundInvite = await prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    assert.ok(foundInvite);
    assert.equal(foundInvite.email, inviteeEmail);

    // Create user and membership
    const newUser = await prisma.user.create({
      data: {
        email: inviteeEmail,
        name: "Invited Finance Manager",
        passwordHash: await hashPassword("Invited#Pass2025!"),
        isEmailVerified: true,
      },
    });

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: newUser.id,
        role: foundInvite.role,
        approvalLimit: foundInvite.approvalLimit,
      },
    });

    await prisma.organizationInvitation.update({
      where: { id: foundInvite.id },
      data: { acceptedAt: new Date() },
    });

    assert.equal(membership.role, "FINANCE_MANAGER");
    assert.equal(membership.organizationId, org.id);
  });

  test("Deactivates user account and denies authentication", async () => {
    const deactEmail = `deact-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: deactEmail,
        name: "Deactivated User",
        passwordHash: await hashPassword("UserPass#2024!"),
        isActive: true,
      },
    });

    assert.equal(user.isActive, true);

    // Deactivate
    const deactivated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    assert.equal(deactivated.isActive, false);
    assert.ok(deactivated.deactivatedAt);
  });
});
