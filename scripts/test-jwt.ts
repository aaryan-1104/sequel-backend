import assert from "assert";
import { signJwtToken, verifyJwtToken } from "../src/server/utils/jwt.js";
import { getUserIdByToken } from "../src/server/services/db.js";

async function runJwtTests() {
  console.log("[JWT Test] Starting Stateless JWT Authentication Test Suite...\n");

  // 1. Valid Token Generation & Verification
  const userId = "user-test-123456";
  const token = signJwtToken(userId, 30);
  assert(token, "Token should be generated");
  assert.strictEqual(token.split(".").length, 3, "Token must be a valid 3-part JWT");
  const verifiedUserId = verifyJwtToken(token);
  assert.strictEqual(verifiedUserId, userId, "Decoded user ID must match original");
  console.log("✅ Valid Token Signing & Verification passed");

  // 2. Tampered Token Rejection
  const parts = token.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ sub: "user-hacker-999", exp: 9999999999 })).toString("base64url");
  const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
  const tamperedResult = verifyJwtToken(forgedToken);
  assert.strictEqual(tamperedResult, null, "Tampered signature must be rejected");
  console.log("✅ Tampered/Forged Token Rejection passed");

  // 3. Expired Token Rejection
  const expiredToken = signJwtToken(userId, -1);
  const expiredResult = verifyJwtToken(expiredToken);
  assert.strictEqual(expiredResult, null, "Expired token must be rejected");
  console.log("✅ Expired Token Rejection passed");

  // 4. Sub-Millisecond Speed Test
  const speedUserId = "user-speed-benchmark-777";
  const speedToken = signJwtToken(speedUserId, 60);
  const start = performance.now();
  const resolvedId = await getUserIdByToken(speedToken);
  const elapsed = performance.now() - start;
  assert.strictEqual(resolvedId, speedUserId, "Resolved ID must match via getUserIdByToken");
  assert(elapsed < 15, `Stateless resolution must be instant (took ${elapsed.toFixed(2)}ms)`);
  console.log(`✅ Stateless resolution passed in ${elapsed.toFixed(3)}ms (< 15ms target)`);

  console.log("\n🎉 All 4 Stateless JWT Tests Passed Successfully!");
}

runJwtTests().catch((err) => {
  console.error("❌ JWT Test Failed:", err);
  process.exit(1);
});
