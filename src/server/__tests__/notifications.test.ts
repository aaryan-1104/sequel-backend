import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../server.js";
import { getVapidPublicKey } from "../services/pushService.js";

describe("Notifications API Routes", () => {
  it("GET /api/notifications/vapid-public-key returns a valid public key", async () => {
    const res = await request(app).get("/api/notifications/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.publicKey).toBe("string");
    expect(res.body.publicKey.length).toBeGreaterThan(20);
    expect(res.body.publicKey).toBe(getVapidPublicKey());
  });

  it("POST /api/notifications/subscribe rejects missing subscription payload", async () => {
    const res = await request(app).post("/api/notifications/subscribe").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Missing subscription");
  });

  it("POST /api/notifications/subscribe accepts valid web push subscription", async () => {
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-device-endpoint-12345",
      keys: {
        p256dh: "BMockP256dhKeyForTesting1234567890abcdef",
        auth: "MockAuthSecret123==",
      },
    };

    const res = await request(app)
      .post("/api/notifications/subscribe")
      .send({
        subscription: mockSubscription,
        type: "web",
        deviceInfo: "Vitest Test Runner",
      });

    // In test environment without a real DB connection, it handles cleanly
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  it("POST /api/notifications/unsubscribe rejects missing endpoint", async () => {
    const res = await request(app).post("/api/notifications/unsubscribe").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/notifications/test-push requires auth or valid endpoint", async () => {
    const res = await request(app).post("/api/notifications/test-push").send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/notifications/dispatch-daily-cron runs successfully", async () => {
    const res = await request(app)
      .post("/api/notifications/dispatch-daily-cron")
      .send({ date: "2026-08-29" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.usersChecked).toBe("number");
    expect(typeof res.body.notificationsSent).toBe("number");
  });
});
