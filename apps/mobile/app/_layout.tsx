// @version 0.2.0 - Conduit: ClerkProvider wrapping root layout
// @version 1.5.0 - Chorus: push notification registration
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { tokenCache } from "../lib/storage";
import { PushNotificationProvider } from "../hooks/PushNotificationProvider";

// ESCAPE: Expo env vars accessed via process.env at build time, not a true Node env
declare const process: { env: { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string } };

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout(): React.JSX.Element {
  if (!publishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <PushNotificationProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </PushNotificationProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
