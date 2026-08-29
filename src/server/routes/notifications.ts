import { Router } from "express";
import { getUserIdByToken } from "../services/db.js";
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  sendPushToUser,
  dispatchDailyReleaseRadar,
} from "../services/pushService.js";

const router = Router();

/**
 * GET /api/notifications/vapid-public-key
 * Returns the VAPID public key needed for the browser pushManager subscription
 */
router.get("/vapid-public-key", (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    return res.json({ success: true, publicKey });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to get VAPID key" });
  }
});

/**
 * POST /api/notifications/subscribe
 * Registers or updates a device push subscription
 */
router.post("/subscribe", async (req, res) => {
  const { token, subscription, type, deviceInfo } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: "Missing subscription endpoint" });
  }

  let userId: string | null = null;
  if (token) {
    userId = await getUserIdByToken(token);
  }

  // Allow anonymous / guest device registration with a fallback identifier
  if (!userId) {
    userId = req.body.userId || "guest-" + Buffer.from(subscription.endpoint).toString("base64").slice(0, 16);
  }

  const p256dh = subscription.keys?.p256dh || null;
  const auth = subscription.keys?.auth || null;

  const success = await savePushSubscription({
    userId,
    type: type || "web",
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    deviceInfo: deviceInfo || req.headers["user-agent"] || undefined,
  });

  if (success) {
    return res.json({ success: true, message: "Push subscription saved successfully" });
  } else {
    return res.status(500).json({ success: false, error: "Failed to save push subscription" });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Removes a device push subscription
 */
router.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ success: false, error: "Missing subscription endpoint" });
  }

  const success = await removePushSubscription(endpoint);
  return res.json({ success });
});

/**
 * POST /api/notifications/test-push
 * Sends a real test notification to the user's registered devices
 */
router.post("/test-push", async (req, res) => {
  const { token, endpoint } = req.body;

  let userId: string | null = null;
  if (token) {
    userId = await getUserIdByToken(token);
  }

  if (!userId && endpoint) {
    userId = "guest-" + Buffer.from(endpoint).toString("base64").slice(0, 16);
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication or valid endpoint required" });
  }

  const testPayload = {
    title: "Chronicle Release Radar",
    body: "Test notification delivered! You will receive morning alerts when episodes air.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: {
      url: "/#dashboard",
      type: "test",
      timestamp: new Date().toISOString(),
    },
    tag: "test-alert",
    renotify: true,
  };

  const result = await sendPushToUser(userId, testPayload);
  return res.json({
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
  });
});

/**
 * POST /api/notifications/dispatch-daily-cron
 * Cron job trigger that finds releases for all subscribed users and pushes alerts
 */
router.post("/dispatch-daily-cron", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
    return res.status(401).json({ success: false, error: "Unauthorized cron execution" });
  }

  const targetDateIso = req.body.date || req.query.date as string || undefined;
  const result = await dispatchDailyReleaseRadar(targetDateIso);

  return res.json({
    success: true,
    usersChecked: result.usersChecked,
    notificationsSent: result.notificationsSent,
  });
});

export default router;
