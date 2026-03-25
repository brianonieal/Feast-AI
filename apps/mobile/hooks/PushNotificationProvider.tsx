// @version 1.5.0 - Chorus: wires push notification registration
// Must be rendered inside ClerkProvider/ClerkLoaded to access useAuth()
import { useAuth } from "@clerk/clerk-expo";
import { usePushNotifications } from "./usePushNotifications";

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { userId } = useAuth();
  usePushNotifications(userId ?? null);
  return <>{children}</>;
}
