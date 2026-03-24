// @version 0.5.0 - Echo: Home / The Table screen (mobile)
// Matches web home page visual direction — warm linen, Fraunces-style headings,
// left-border accent cards, mustard CTAs
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEAST_COLORS } from "@feast-ai/shared";

// Seed data — placeholders only
const SEED_FEED = [
  {
    id: "1",
    initials: "BN",
    name: "Brian N.",
    time: "2h ago",
    body: "Last night\u2019s dinner in Brooklyn was one for the books. The conversation about community resilience really resonated.",
  },
  {
    id: "2",
    initials: "MJ",
    name: "Monica J.",
    time: "5h ago",
    body: "Grateful for the mutual aid circle this week. Sometimes showing up is the hardest part.",
  },
];

export default function HomeScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Section header */}
        <Text style={styles.sectionLabel}>The Table</Text>
        <Text style={styles.heading}>What are you hungry for?</Text>

        {/* Daily Nourishment card */}
        <View style={styles.nourishCard}>
          <Text style={styles.sectionLabel}>Today&apos;s Nourishment</Text>
          <Text style={styles.nourishHeading}>Journey Joy?</Text>
          <Text style={styles.nourishSub}>
            What moment this week reminded you why you show up?
          </Text>
          <View style={styles.reflectRow}>
            <View style={styles.tealDot} />
            <Text style={styles.reflectText}>Reflect</Text>
          </View>
        </View>

        {/* Community pulse */}
        <View style={styles.pulseRow}>
          <View style={styles.pulseCard}>
            <Text style={[styles.pulseNumber, { color: FEAST_COLORS.navy }]}>
              247
            </Text>
            <Text style={styles.pulseLabel}>Members</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={[styles.pulseNumber, { color: FEAST_COLORS.teal }]}>
              12
            </Text>
            <Text style={styles.pulseLabel}>Dinners</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text
              style={[styles.pulseNumber, { color: FEAST_COLORS.mustard }]}
            >
              89%
            </Text>
            <Text style={styles.pulseLabel}>Attendance</Text>
          </View>
        </View>

        {/* Feed */}
        <Text style={[styles.sectionLabel, { color: FEAST_COLORS.inkLight }]}>
          Community Feed
        </Text>
        {SEED_FEED.map((post) => (
          <View key={post.id} style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.initials}</Text>
              </View>
              <Text style={styles.feedName}>{post.name}</Text>
              <Text style={styles.feedTime}>{post.time}</Text>
            </View>
            <Text style={styles.feedBody} numberOfLines={2}>
              {post.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FEAST_COLORS.bgPage,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 16 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: FEAST_COLORS.mustard,
    marginBottom: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: "300",
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
    lineHeight: 30,
  },

  // Nourishment card
  nourishCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: FEAST_COLORS.mustard,
    padding: 14,
  },
  nourishHeading: {
    fontSize: 20,
    fontWeight: "300",
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
    marginTop: 4,
  },
  nourishSub: {
    fontSize: 14,
    color: FEAST_COLORS.inkMid,
    marginTop: 4,
    lineHeight: 20,
  },
  reflectRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 },
  tealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FEAST_COLORS.teal,
  },
  reflectText: { fontSize: 12, fontWeight: "500", color: FEAST_COLORS.teal },

  // Pulse strip
  pulseRow: { flexDirection: "row", gap: 8 },
  pulseCard: {
    flex: 1,
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  pulseNumber: { fontSize: 18, fontWeight: "300", fontStyle: "italic" },
  pulseLabel: { fontSize: 10, color: FEAST_COLORS.inkLight, marginTop: 2 },

  // Feed cards
  feedCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: FEAST_COLORS.navy,
    padding: 14,
  },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FEAST_COLORS.mustardSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "700", color: FEAST_COLORS.mustard },
  feedName: { fontSize: 11, fontWeight: "700", color: FEAST_COLORS.inkDark },
  feedTime: { fontSize: 11, color: FEAST_COLORS.inkLight },
  feedBody: { fontSize: 12, color: FEAST_COLORS.inkMid, lineHeight: 18 },
});
