// @version 0.1.0 - Foundation scaffold
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout(): React.JSX.Element {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
