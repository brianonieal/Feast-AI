// @version 0.2.0 - Conduit: Login screen
import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import { colors, typography, APP_NAME } from "@feast-ai/shared";

export default function LoginScreen(): React.JSX.Element {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, email, password, setActive, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Sign In</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.neutral[500]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.neutral[500]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.neutral[900]} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>

        <Link href="/(auth)/signup" style={styles.link}>
          <Text style={styles.linkText}>
            Don&apos;t have an account? Sign Up
          </Text>
        </Link>
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
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: typography.sizes["3xl"],
    fontWeight: typography.weights.bold,
    color: colors.primary[500],
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.dark.textPrimary,
    textAlign: "center",
    marginBottom: 32,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.dark.elevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: typography.sizes.base,
    color: colors.dark.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  link: {
    marginTop: 24,
    alignSelf: "center",
  },
  linkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary[500],
  },
});
