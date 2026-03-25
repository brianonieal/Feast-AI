// @version 1.5.0 - Chorus
// Expo push notification service
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
} from "expo-server-sdk";
import { db } from "../lib/db";

// Expo client — accessToken is optional for development
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

export type NotificationType =
  | "event_reminder"
  | "weekly_digest"
  | "new_event_in_city"
  | "waitlist_promotion"
  | "welcome";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// TODO v1.6.0: cache preferences in Upstash Redis
// to avoid DB lookup on every notification
async function isNotificationEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) return true; // default: all enabled

  const map: Record<NotificationType, boolean> = {
    event_reminder: pref.eventReminders,
    weekly_digest: pref.weeklyDigest,
    new_event_in_city: pref.newEventInCity,
    waitlist_promotion: pref.waitlistUpdates,
    welcome: pref.welcomeNotif,
  };

  return map[type] ?? true;
}

/** Send push notification to a single user */
export async function sendPushNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  // Check preferences
  const enabled = await isNotificationEnabled(payload.userId, payload.type);
  if (!enabled) {
    await logNotification({ ...payload, status: "skipped" });
    return { success: true };
  }

  // Get active push tokens for this user
  const tokens = await db.pushToken.findMany({
    where: { userId: payload.userId, isActive: true },
  });

  if (tokens.length === 0) {
    await logNotification({
      ...payload,
      status: "skipped",
      error: "No active tokens",
    });
    return { success: true };
  }

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default" as const,
    }));

  if (messages.length === 0) {
    return { success: false, error: "No valid Expo tokens" };
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }

    const firstTicket = tickets[0];
    const receiptId =
      firstTicket?.status === "ok" ? firstTicket.id : undefined;
    const error =
      firstTicket?.status === "error" ? firstTicket.message : undefined;

    await logNotification({
      ...payload,
      status: error ? "failed" : "sent",
      expoReceipt: receiptId,
      error,
    });

    return { success: !error, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logNotification({ ...payload, status: "failed", error });
    return { success: false, error };
  }
}

/** Send to multiple users (e.g. all users in a city) */
export async function sendBulkNotification(
  userIds: string[],
  payload: Omit<NotificationPayload, "userId">
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  const skipped = 0;

  // Process in batches of 10 to avoid overwhelming Expo API
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (userId) => {
        const result = await sendPushNotification({ ...payload, userId });
        if (result.success) sent++;
        else failed++;
      })
    );
  }

  return { sent, failed, skipped };
}

/** Register or update a push token for a user */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: "ios" | "android"
): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error(`Invalid Expo push token: ${token}`);
  }

  await db.pushToken.upsert({
    where: { token },
    update: { userId, platform, isActive: true, updatedAt: new Date() },
    create: { userId, token, platform },
  });
}

/** Deactivate a token (user logged out or token expired) */
export async function deactivatePushToken(token: string): Promise<void> {
  await db.pushToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

// ── Internal logging ────────────────────────────────────────────

async function logNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: string;
  expoReceipt?: string;
  error?: string;
}): Promise<void> {
  try {
    await db.notificationLog.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        // ESCAPE: Prisma Json type requires explicit cast from Record<string, unknown>
        data: params.data as undefined | Record<string, string | number | boolean>,
        status: params.status,
        expoReceipt: params.expoReceipt,
        error: params.error,
      },
    });
  } catch (err) {
    console.error("[Notifications] Failed to log:", err);
  }
}
