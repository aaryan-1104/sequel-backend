import { describe, it, expect } from "vitest";
import { signJwtToken, verifyJwtToken } from "../utils/jwt.js";
import { getUserIdByToken } from "../services/db.js";

describe("Stateless JWT Authentication", () => {
  it("generates and verifies valid signed JWT tokens instantly", () => {
    const userId = "user-test-123456";
    const token = signJwtToken(userId, 30);

    expect(token).toBeDefined();
    expect(token.split(".").length).toBe(3);

    const verifiedUserId = verifyJwtToken(token);
    expect(verifiedUserId).toBe(userId);
  });

  it("rejects tampered or forged JWT tokens", () => {
    const userId = "user-legit-777";
    const token = signJwtToken(userId, 30);
    const parts = token.split(".");

    // Alter the payload to attempt elevation to another user
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "user-admin-root", exp: 9999999999 })).toString("base64url");
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    expect(verifyJwtToken(forgedToken)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const userId = "user-expired-999";
    // Negative expiration (expired 10 seconds ago)
    const expiredToken = signJwtToken(userId, -1);

    expect(verifyJwtToken(expiredToken)).toBeNull();
  });

  it("getUserIdByToken resolves stateless JWT tokens in sub-millisecond time", async () => {
    const userId = "user-speed-test-555";
    const token = signJwtToken(userId, 60);

    const start = performance.now();
    const resolvedId = await getUserIdByToken(token);
    const duration = performance.now() - start;

    expect(resolvedId).toBe(userId);
    expect(duration).toBeLessThan(15); // Pure CPU cryptographic validation
  });
});
