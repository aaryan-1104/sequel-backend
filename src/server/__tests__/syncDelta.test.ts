import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../server.js";

describe("Delta Sync Endpoint (/api/auth/sync-delta)", () => {
  it("rejects unauthorized requests with no token", async () => {
    const res = await request(app)
      .post("/api/auth/sync-delta")
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Unauthorized");
  });

  it("rejects invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/sync-delta")
      .send({ token: "invalid-token-xyz" });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid session");
  });
});
