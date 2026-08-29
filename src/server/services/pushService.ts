import webpush from "web-push";
import { db } from "../db/index.js";
import { userPushSubscriptions, mediaItems } from "../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
  renotify?: boolean;
}

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@chronicle.app";

// Auto-generate keys in development if not supplied
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };
  console.log("[pushService] VAPID keys auto-generated for current session.");
}

// Configure webpush client
try {
  webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);
} catch (err) {
  console.warn("[pushService] Failed to set initial VAPID details:", err);
}

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

export async function savePushSubscription(data: {
  userId: string;
  type?: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
  deviceInfo?: string;
}): Promise<boolean> {
  if (!db || !data.userId || !data.endpoint) return false;

  const now = new Date().toISOString();
  const subId = crypto.randomUUID();

  try {
    const existing = await db
      .select()
      .from(userPushSubscriptions)
      .where(eq(userPushSubscriptions.endpoint, data.endpoint));

    if (existing.length > 0) {
      await db
        .update(userPushSubscriptions)
        .set({
          userId: data.userId,
          type: data.type || "web",
          p256dh: data.p256dh || null,
          auth: data.auth || null,
          deviceInfo: data.deviceInfo || null,
          updatedAt: now,
        })
        .where(eq(userPushSubscriptions.endpoint, data.endpoint));
    } else {
      await db.insert(userPushSubscriptions).values({
        id: subId,
        userId: data.userId,
        type: data.type || "web",
        endpoint: data.endpoint,
        p256dh: data.p256dh || null,
        auth: data.auth || null,
        deviceInfo: data.deviceInfo || null,
        createdAt: now,
        updatedAt: now,
      });
    }
    return true;
  } catch (err) {
    console.error("[pushService] Failed to save push subscription:", err);
    return false;
  }
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  if (!db || !endpoint) return false;
  try {
    await db.delete(userPushSubscriptions).where(eq(userPushSubscriptions.endpoint, endpoint));
    return true;
  } catch (err) {
    console.error("[pushService] Failed to remove push subscription:", err);
    return false;
  }
}

export async function sendWebPush(
  sub: { endpoint: string; p256dh?: string | null; auth?: string | null },
  payload: PushPayload
): Promise<{ success: boolean; isExpired?: boolean; error?: string }> {
  if (!sub.endpoint) return { success: false, error: "Missing endpoint" };

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh || "",
      auth: sub.auth || "",
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription has expired or unsubscribed
      if (db) {
        await db.delete(userPushSubscriptions).where(eq(userPushSubscriptions.endpoint, sub.endpoint)).catch(() => {});
      }
      return { success: false, isExpired: true, error: "Subscription expired" };
    }
    return { success: false, error: err?.message || String(err) };
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!db || !userId) return { sent: 0, failed: 0 };

  try {
    const subs = await db
      .select()
      .from(userPushSubscriptions)
      .where(eq(userPushSubscriptions.userId, userId));

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      const res = await sendWebPush(sub, payload);
      if (res.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  } catch (err) {
    console.error(`[pushService] Failed sending push to user ${userId}:`, err);
    return { sent: 0, failed: 0 };
  }
}

export async function dispatchDailyReleaseRadar(targetDateIso?: string): Promise<{
  usersChecked: number;
  notificationsSent: number;
}> {
  if (!db) return { usersChecked: 0, notificationsSent: 0 };

  const dateStr = targetDateIso || new Date().toISOString().slice(0, 10);

  try {
    // 1. Get distinct user IDs with active push subscriptions
    const activeSubs = await db.select().from(userPushSubscriptions);
    const userIds = Array.from(new Set(activeSubs.map((s) => s.userId)));

    let notificationsSent = 0;

    for (const userId of userIds) {
      // 2. Query user's active watchlist / in-progress library items
      const userItems = await db
        .select()
        .from(mediaItems)
        .where(
          and(
            eq(mediaItems.userId, userId),
            inArray(mediaItems.status, ["watchlist", "in-progress", "planning"])
          )
        );

      // 3. Find items releasing today
      const todayReleases = userItems.filter((item) => {
        // Direct movie / show release date match
        if (item.releaseDate && item.releaseDate.slice(0, 10) === dateStr) {
          return true;
        }

        // Check episode specifics if stored in tvSpecifics
        const specifics = item.tvSpecifics as any;
        if (specifics && specifics.nextAirDate && specifics.nextAirDate.slice(0, 10) === dateStr) {
          return true;
        }

        return false;
      });

      if (todayReleases.length === 0) continue;

      // 4. Construct rich notification payload
      let title = "Chronicle Release Radar";
      let body = "";
      let targetUrl = "/";
      let mediaId = "";

      if (todayReleases.length === 1) {
        const item = todayReleases[0];
        mediaId = item.id;
        const specifics = item.tvSpecifics as any;
        const epBadge = specifics?.nextEpisodeBadge || (item.type === "tv" ? "New Episode" : "Digital Premiere");

        title = `${item.title} (${epBadge})`;
        body = `Now available today on your watchlist!`;
        targetUrl = `/#detail-${item.type}-${item.id}`;
      } else {
        const titles = todayReleases.slice(0, 3).map((i) => i.title).join(", ");
        const extra = todayReleases.length > 3 ? ` +${todayReleases.length - 3} more` : "";
        title = `${todayReleases.length} New Releases Today`;
        body = `${titles}${extra} are available today in your watchlist.`;
        targetUrl = `/#dashboard`;
      }

      const res = await sendPushToUser(userId, {
        title,
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: {
          url: targetUrl,
          mediaId,
          releaseDate: dateStr,
          totalDrops: todayReleases.length,
        },
        tag: `release-radar-${dateStr}`,
        renotify: true,
      });

      notificationsSent += res.sent;
    }

    return { usersChecked: userIds.length, notificationsSent };
  } catch (err) {
    console.error("[pushService] Error during dispatchDailyReleaseRadar:", err);
    return { usersChecked: 0, notificationsSent: 0 };
  }
}
