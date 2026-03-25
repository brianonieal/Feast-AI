# FEAST-AI v1.5.0 CHORUS BLUEPRINT
# Codename: Chorus
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Push notifications -- Expo + 5 notification types + weekly digest

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. This file (CHORUS_BLUEPRINT_v1.5.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.5.0
Sacred Rule: Do not build anything from v1.6.0 or later.

---

## SECTION 1: SCOPE

v1.5.0 Chorus adds push notifications to the platform.
Members get timely, relevant nudges that bring them back
to the community without being spammy.

### What gets built:
1. PushToken model -- stores Expo push tokens per user
2. NotificationLog model -- audit trail of sent notifications
3. Expo push notification service -- sends via Expo Push API
4. 5 notification triggers:
   - Event reminder (24h before)
   - Weekly digest (Sunday 10am)
   - New event in city
   - Waitlist promotion
   - Welcome notification
5. Inngest functions -- 2 new scheduled + trigger-based
6. Notification preference API -- opt in/out per type
7. Mobile: register push token on app launch
8. Admin: notification stats in /admin/impact page

### What does NOT change:
- No new web pages (notification prefs are API-only in v1.5.0)
- No changes to existing agent logic
- No schema changes to existing models

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

```prisma
// @version 1.5.0 - Chorus

model PushToken {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique          // Expo push token
  platform  String   @default("ios")  // 'ios', 'android'
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("push_tokens")
}

model NotificationPreference {
  id              String   @id @default(cuid())
  userId          String   @unique @map("user_id")
  user            User     @relation(fields: [userId], references: [id])
  eventReminders  Boolean  @default(true) @map("event_reminders")
  weeklyDigest    Boolean  @default(true) @map("weekly_digest")
  newEventInCity  Boolean  @default(true) @map("new_event_in_city")
  waitlistUpdates Boolean  @default(true) @map("waitlist_updates")
  welcomeNotif    Boolean  @default(true) @map("welcome_notif")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("notification_preferences")
}

model NotificationLog {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  user         User     @relation(fields: [userId], references: [id])
  type         String                    // notification type key
  title        String
  body         String
  data         Json?                     // extra payload
  status       String   @default("sent") // 'sent', 'failed', 'skipped'
  expoReceipt  String?  @map("expo_receipt")
  error        String?
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@map("notification_logs")
}
```

Add reverse relations to User model:
```prisma
pushTokens              PushToken[]
notificationPreference  NotificationPreference?
notificationLogs        NotificationLog[]
```

After adding:
  npx prisma migrate dev --name add_chorus_models
  npx prisma validate
  pnpm typecheck

---

## SECTION 3: EXPO PUSH NOTIFICATION SERVICE

Install expo-server-sdk in apps/api:
  pnpm --filter api add expo-server-sdk

Create apps/api/src/services/notifications.ts:

```typescript
// @version 1.5.0 - Chorus
// Expo push notification service
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { db } from '../lib/db';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export type NotificationType =
  | 'event_reminder'
  | 'weekly_digest'
  | 'new_event_in_city'
  | 'waitlist_promotion'
  | 'welcome';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Check user's notification preference for a given type
async function isNotificationEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) return true; // default: all enabled

  const map: Record<NotificationType, boolean> = {
    event_reminder:    pref.eventReminders,
    weekly_digest:     pref.weeklyDigest,
    new_event_in_city: pref.newEventInCity,
    waitlist_promotion: pref.waitlistUpdates,
    welcome:           pref.welcomeNotif,
  };

  return map[type] ?? true;
}

// Send push notification to a single user
export async function sendPushNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  // Check preferences
  const enabled = await isNotificationEnabled(payload.userId, payload.type);
  if (!enabled) {
    await logNotification({ ...payload, status: 'skipped' });
    return { success: true };
  }

  // Get active push tokens for this user
  const tokens = await db.pushToken.findMany({
    where: { userId: payload.userId, isActive: true },
  });

  if (tokens.length === 0) {
    await logNotification({ ...payload, status: 'skipped', error: 'No active tokens' });
    return { success: true };
  }

  const messages: ExpoPushMessage[] = tokens
    .filter(t => Expo.isExpoPushToken(t.token))
    .map(t => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

  if (messages.length === 0) {
    return { success: false, error: 'No valid Expo tokens' };
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }

    const firstTicket = tickets[0];
    const receiptId = firstTicket?.status === 'ok' ? firstTicket.id : undefined;
    const error = firstTicket?.status === 'error' ? firstTicket.message : undefined;

    await logNotification({
      ...payload,
      status: error ? 'failed' : 'sent',
      expoReceipt: receiptId,
      error,
    });

    return { success: !error, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logNotification({ ...payload, status: 'failed', error });
    return { success: false, error };
  }
}

// Send to multiple users (e.g. all users in a city)
export async function sendBulkNotification(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0, failed = 0, skipped = 0;

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
        data: params.data,
        status: params.status,
        expoReceipt: params.expoReceipt,
        error: params.error,
      },
    });
  } catch (err) {
    console.error('[Notifications] Failed to log:', err);
  }
}

// Register or update a push token for a user
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android'
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

// Deactivate a token (user logged out or token expired)
export async function deactivatePushToken(token: string): Promise<void> {
  await db.pushToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}
```

Add to .env.example:
```
# v1.5.0 Chorus -- Push notifications
EXPO_ACCESS_TOKEN=       # expo.dev → Account → Access Tokens (optional for dev)
```

---

## SECTION 4: INNGEST NOTIFICATION FUNCTIONS

### 4.1 Event reminder function (new)

Create apps/api/src/inngest/functions/event-reminder.ts:

```typescript
// @version 1.5.0 - Chorus
// Runs every hour -- checks for events starting in ~24h
// Sends reminder push notifications to confirmed attendees

import { inngest } from '../client';
import { db } from '../../lib/db';
import { sendPushNotification } from '../../services/notifications';
import { saveFailedJob } from '../../services/deadLetter';

export const eventReminderFunction = inngest.createFunction(
  {
    id: 'event-reminder',
    name: 'Event Reminders — Chorus',
    retries: 2,
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: 'event-reminder',
        eventName: 'scheduled/hourly',
        payload: {},
        error: ctx.error?.message ?? 'Unknown',
        attempts: ctx.attempt ?? 1,
      });
    },
  },
  { cron: '0 * * * *' },  // every hour
  async ({ step }) => {
    // Find events starting in 23-25 hours from now
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const events = await step.run('fetch-upcoming-events', async () => {
      return db.feastEvent.findMany({
        where: {
          date: { gte: windowStart, lte: windowEnd },
          status: { in: ['MARKETED', 'LIVE'] },
        },
        include: {
          attendances: {
            where: { status: 'CONFIRMED' },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    let sent = 0;
    for (const event of events) {
      for (const attendance of event.attendances) {
        await step.run(`remind-${event.id}-${attendance.userId}`, async () => {
          await sendPushNotification({
            userId: attendance.userId,
            type: 'event_reminder',
            title: 'Your Feast dinner is tomorrow 🍽',
            body: `Don't forget — "${event.name}" in ${event.city} starts tomorrow.`,
            data: { eventId: event.id, screen: 'EventDetail' },
          });
          sent++;
        });
      }
    }

    return { events: events.length, reminders: sent };
  }
);
```

### 4.2 Weekly digest function (new)

Create apps/api/src/inngest/functions/weekly-digest.ts:

```typescript
// @version 1.5.0 - Chorus
// Runs every Sunday at 10am UTC
// Sends weekly community digest to all opted-in members

import { inngest } from '../client';
import { db } from '../../lib/db';
import { sendBulkNotification } from '../../services/notifications';
import { getImpactMetrics } from '../../services/analytics';
import { saveFailedJob } from '../../services/deadLetter';

export const weeklyDigestFunction = inngest.createFunction(
  {
    id: 'weekly-digest',
    name: 'Weekly Digest — Chorus',
    retries: 1,
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: 'weekly-digest',
        eventName: 'scheduled/weekly',
        payload: {},
        error: ctx.error?.message ?? 'Unknown',
        attempts: ctx.attempt ?? 1,
      });
    },
  },
  { cron: '0 10 * * 0' },  // Sunday 10am UTC
  async ({ step }) => {
    // Get community metrics for the digest
    const metrics = await step.run('fetch-metrics', async () => {
      return getImpactMetrics();
    });

    // Get all users with push tokens
    const users = await step.run('fetch-users', async () => {
      return db.user.findMany({
        where: { pushTokens: { some: { isActive: true } } },
        select: { id: true },
      });
    });

    const userIds = users.map(u => u.id);

    const result = await step.run('send-digest', async () => {
      return sendBulkNotification(userIds, {
        type: 'weekly_digest',
        title: 'The Feast — Weekly Update 🌱',
        body: `${metrics.dinnersHosted} dinners hosted. ${metrics.peopleConnected} people connected. The table is growing.`,
        data: { screen: 'Home' },
      });
    });

    return { recipients: userIds.length, ...result };
  }
);
```

### 4.3 Update existing pipelines to trigger notifications

Update application-submitted.ts -- after classification,
send welcome notification:

```typescript
// Add to application-submitted pipeline after Step 2:
await step.run('send-welcome-notification', async () => {
  await sendPushNotification({
    userId,
    type: 'welcome',
    title: 'Welcome to The Feast 🍽',
    body: 'Your application is received. We\'ll be in touch soon.',
    data: { screen: 'Home' },
  }).catch(() => {})  // silent -- notification is non-critical
});
```

Update waitlist.ts -- in promoteFromWaitlist(), send notification:

```typescript
// Add after marking entry as notified:
import { sendPushNotification } from './notifications';

await sendPushNotification({
  userId: entry.userId,
  type: 'waitlist_promotion',
  title: 'You\'re off the waitlist! 🎉',
  body: `A spot opened up for "${eventName}". You\'re confirmed!`,
  data: { eventId, screen: 'EventDetail' },
}).catch(() => {})
```

Update event-created.ts -- send new event notification to
users in the same city who have opted in:

```typescript
// Add as last step in event-created pipeline:
await step.run('notify-city-members', async () => {
  const cityUsers = await db.user.findMany({
    where: {
      pushTokens: { some: { isActive: true } },
      // Match by city via member intents or regional interest
      memberIntents: { some: { city: event.city } },
    },
    select: { id: true },
  });

  if (cityUsers.length === 0) return { notified: 0 };

  await sendBulkNotification(
    cityUsers.map(u => u.id),
    {
      type: 'new_event_in_city',
      title: `New dinner in ${event.city} 🍽`,
      body: `"${event.name}" has been posted. Seats are limited.`,
      data: { eventId: event.id, screen: 'Events' },
    }
  );

  return { notified: cityUsers.length };
});
```

---

## SECTION 5: API ROUTES

### POST /api/notifications/token
Register or update push token for authenticated user.
Body: { token: string, platform: 'ios' | 'android' }

### DELETE /api/notifications/token
Deactivate push token (on logout).
Body: { token: string }

### GET /api/notifications/preferences
Get notification preferences for authenticated user.

### PATCH /api/notifications/preferences
Update notification preferences.
Body: Partial<NotificationPreference fields>

All 4 routes:
- Auth: requireAuth()
- Rate limit: standard

---

## SECTION 6: MOBILE TOKEN REGISTRATION

Update apps/mobile/src/hooks/ or App.tsx to register
the Expo push token on app launch.

Create apps/mobile/src/hooks/usePushNotifications.ts:

```typescript
// @version 1.5.0 - Chorus
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || !Device.isDevice) return;

    async function registerToken() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        const platform = Platform.OS as 'ios' | 'android';

        await fetch(`${API_URL}/api/notifications/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform }),
        });
      } catch (err) {
        console.error('[Push] Token registration failed:', err);
      }
    }

    registerToken();
  }, [userId]);
}
```

Install required Expo packages:
```bash
cd apps/mobile
npx expo install expo-notifications expo-device
```

---

## SECTION 7: EXECUTION ORDER

```
STEP 1: Schema + migration
  - Add PushToken, NotificationPreference, NotificationLog
  - Add reverse relations to User
  - npx prisma migrate dev --name add_chorus_models
  - npx prisma validate + pnpm typecheck
  - Report: migration output

STEP 2: Notification service
  - Install expo-server-sdk in apps/api
  - Create apps/api/src/services/notifications.ts
  - pnpm typecheck
  - Report: functions exported

STEP 3: Inngest functions
  - Create event-reminder.ts
  - Create weekly-digest.ts
  - Register both in inngest/index.ts + serve route
    (total: 9 functions after this step)
  - Update application-submitted.ts (welcome notification)
  - Update event-created.ts (new event in city)
  - pnpm typecheck + pnpm lint
  - Report: all function IDs + cron schedules

STEP 4: Update waitlist service
  - Add sendPushNotification call to promoteFromWaitlist()
  - Import notifications service
  - pnpm typecheck
  - Report: what changed

STEP 5: API routes
  - Create /api/notifications/token (POST + DELETE)
  - Create /api/notifications/preferences (GET + PATCH)
  - pnpm typecheck + pnpm lint
  - next build (API): report route count

STEP 6: Mobile hook
  - Install expo-notifications + expo-device in apps/mobile
  - Create apps/mobile/src/hooks/usePushNotifications.ts
  - Wire into App.tsx or root layout (call hook with userId)
  - pnpm typecheck (mobile package)
  - Report: hook created, where it's wired

STEP 7: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push
  - Report full output

STEP 8: CHANGELOG + CONTRACT + tag + push
  - Write CHANGELOG v1.5.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.5.0
      CURRENT_CODENAME=Chorus
      NEXT_VERSION=1.6.0
      NEXT_CODENAME=Amplify
  - git commit -m "feat: v1.5.0 Chorus — push notifications + weekly digest"
  - git tag v1.5.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 8: v1.5.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] PushToken model in DB
- [ ] NotificationPreference model in DB
- [ ] NotificationLog model in DB
- [ ] sendPushNotification() sends via Expo API
- [ ] sendBulkNotification() batches in groups of 10
- [ ] registerPushToken() upserts correctly
- [ ] event-reminder Inngest function registered (hourly)
- [ ] weekly-digest Inngest function registered (Sunday 10am)
- [ ] Welcome notification on application submit
- [ ] New event notification to city members on event creation
- [ ] Waitlist promotion sends push notification
- [ ] POST /api/notifications/token registers token
- [ ] GET + PATCH /api/notifications/preferences works
- [ ] usePushNotifications hook in mobile app
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: 1.5.0 Chorus / 1.6.0 Amplify
- [ ] Git tagged v1.5.0 + pushed

---

END OF CHORUS BLUEPRINT v1.5.0
