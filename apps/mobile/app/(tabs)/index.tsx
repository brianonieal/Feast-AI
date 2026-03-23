// @version 0.1.0 - Foundation scaffold
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, APP_NAME } from "@feast-ai/shared";

export default function HomeScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Home</Text>
        <Text style={styles.placeholder}>
          Your personalized feed, upcoming events, and community pulse.
        </Text>
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
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: typography.sizes["3xl"],
    fontWeight: typography.weights.bold,
    color: colors.primary[500],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.dark.textPrimary,
    marginBottom: 16,
  },
  placeholder: {
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary,
    textAlign: "center",
  },
});
