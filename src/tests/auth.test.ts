import { describe, it } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { createSessionToken, verifySessionToken } from "../lib/auth/session";

describe("LedgerShield Security: Authentication & Session Integrity", () => {
  it("Securely hashes and verifies passwords with bcrypt salt", async () => {
    const rawPassword = "StrongPassword#2024!";
    const hash = await hashPassword(rawPassword);

    assert.ok(hash.startsWith("$2"), "Password hash should use bcrypt prefix");
    assert.notStrictEqual(hash, rawPassword, "Hash must never equal plain text");

    const isMatch = await verifyPassword(rawPassword, hash);
    assert.strictEqual(isMatch, true, "Valid password should verify successfully");

    const isBadMatch = await verifyPassword("WrongPassword123", hash);
    assert.strictEqual(isBadMatch, false, "Invalid password must be rejected");
  });

  it("Rejects passwords shorter than 8 characters", async () => {
    await assert.rejects(
      async () => {
        await hashPassword("short");
      },
      /Password must be at least 8 characters/
    );
  });

  it("Signs and verifies tamper-evident JWT session tokens", async () => {
    const payload = {
      userId: "usr-test-1",
      email: "auditor@mahindra-pe.com",
      name: "Priya Nair",
      organizationId: "org-test-1",
      organizationName: "Mahindra Precision Engineering",
      role: "INTERNAL_AUDITOR" as const,
      approvalLimit: 50000.0,
    };

    const token = await createSessionToken(payload);
    assert.ok(token && token.split(".").length === 3, "Token should be a standard 3-part JWT");

    const verified = await verifySessionToken(token);
    assert.ok(verified, "Session token should verify successfully");
    assert.strictEqual(verified.userId, payload.userId);
    assert.strictEqual(verified.email, payload.email);
    assert.strictEqual(verified.organizationId, payload.organizationId);
    assert.strictEqual(verified.role, "INTERNAL_AUDITOR");
    assert.strictEqual(verified.approvalLimit, 50000.0);
  });

  it("Rejects tampered or malformed session tokens", async () => {
    const validToken = await createSessionToken({
      userId: "usr-1",
      email: "test@company.com",
      name: "Test User",
      organizationId: "org-1",
      organizationName: "Test Org",
      role: "ADMIN" as const,
      approvalLimit: 100000.0,
    });

    // Tamper with payload part
    const parts = validToken.split(".");
    const tamperedToken = `${parts[0]}.eyAidXNlcklkIjogImhha2VyIiB9.${parts[2]}`;

    const verified = await verifySessionToken(tamperedToken);
    assert.strictEqual(verified, null, "Tampered token must fail verification");

    const invalid = await verifySessionToken("totally-invalid-garbage-token");
    assert.strictEqual(invalid, null, "Malformed token must return null");
  });
});
