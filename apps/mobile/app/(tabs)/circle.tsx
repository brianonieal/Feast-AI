// @version 0.1.0 - Foundation scaffold
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "@feast-ai/shared";

export default function CircleScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Circle</Text>
        <Text style={styles.placeholder}>
          Community conversations and connections.
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
    fontSize: typography.sizes["2xl"],
    fontWeight: typography.weights.bold,
    color: colors.dark.textPrimary,
    marginBottom: 16,
  },
  placeholder: {
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary,
    textAlign: "center",
  },
});
