import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./server.js";
import { hashPassword, verifyPassword } from "./dbHelpers.js";

describe("Database Helpers", () => {
  it("should correctly hash and verify passwords", () => {
    const password = "TestPassword123!";
    const { salt, hash } = hashPassword(password);

    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
    expect(verifyPassword(password, salt, hash)).toBe(true);
    expect(verifyPassword("wrongPassword", salt, hash)).toBe(false);
  });
});

describe("API Integration Endpoints", () => {
  it("GET /api/status - should return server status details", async () => {
    const res = await request(app).get("/api/status");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("online");
    expect(res.body.name).toBe("Sequel / Chronicle Backend API");
  });

  it("GET /api/health - should return health status and Gemini configuration state", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.geminiEnabled).toBe("boolean");
  });

  it("GET /api/firebase-check - should check Firebase Admin configuration", async () => {
    const res = await request(app).get("/api/firebase-check");
    expect([200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
  });

  it("GET /api/non-existent-route - should return 404 JSON response", async () => {
    const res = await request(app).get("/api/non-existent-route");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Endpoint not found");
  });
});
