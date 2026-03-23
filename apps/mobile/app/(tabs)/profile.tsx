// @version 0.2.0 - Conduit: Profile screen with Clerk auth
import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { colors, typography, APP_VERSION } from "@feast-ai/shared";

export default function ProfileScreen(): React.JSX.Element {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/(auth)/login");
  }, [signOut, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text style={styles.name}>
          {user?.fullName ?? "Feast Member"}
        </Text>
        <Text style={styles.email}>
          {user?.primaryEmailAddress?.emailAddress ?? ""}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Preferences</Text>
            <Text style={styles.rowValue}>Coming soon</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Facilitator Resources</Text>
            <Text style={styles.rowValue}>Coming soon</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Host Dashboard</Text>
            <Text style={styles.rowValue}>Coming soon</Text>
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: typography.sizes["3xl"],
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.dark.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginBottom: 32,
  },
  section: {
    width: "100%",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.dark.textMuted,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
    color: colors.dark.textPrimary,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    color: colors.dark.textMuted,
  },
  signOutButton: {
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },
  version: {
    fontSize: typography.sizes.sm,
    color: colors.dark.textMuted,
    marginTop: 24,
  },
});
