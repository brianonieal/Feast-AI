// @version 1.5.0 - Chorus: Expo push notification registration
// Registers the device's Expo push token with the API on app launch.
// Requires userId from Clerk auth context — no-ops if null or not a device.

import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// ESCAPE: Expo env vars accessed via process.env at build time
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function usePushNotifications(userId: string | null): void {
  useEffect(() => {
    if (!userId || !Device.isDevice) return;

    async function registerToken() {
      try {
        // Android: set up notification channel
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        // Check/request permissions
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        const platform = Platform.OS as "ios" | "android";

        // Register with API
        await fetch(`${API_URL}/api/notifications/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform }),
        });
      } catch (err) {
        console.error("[Push] Token registration failed:", err);
      }
    }

    registerToken();
  }, [userId]);
}
