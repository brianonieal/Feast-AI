// @version 0.5.0 - Echo: Circle screen (mobile)
// Reflection Circles + Mutual Aid — warm linen design
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEAST_COLORS } from "@feast-ai/shared";

const SEED_CIRCLES = [
  { id: "rc1", theme: "Gratitude & Belonging", members: 6, next: "Mar 28" },
  { id: "rc2", theme: "Creative Nourishment", members: 5, next: "Apr 2" },
];

const SEED_AID = [
  { id: "ma1", type: "offering" as const, name: "Diego P.", desc: "Design feedback" },
  { id: "ma2", type: "seeking" as const, name: "Sarah E.", desc: "Help quiet space June" },
];

export default function CircleScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Section 1: Reflection Circles */}
        <Text style={styles.sectionLabel}>Reflection Circles</Text>
        <Text style={styles.heading}>Your Circle</Text>

        {SEED_CIRCLES.map((c) => (
          <View key={c.id} style={styles.circleCard}>
            <Text style={styles.cardTitle}>{c.theme}</Text>
            <Text style={styles.cardMeta}>
              {c.members} members · Next: {c.next}
            </Text>
          </View>
        ))}

        <Pressable style={styles.ctaButton}>
          <Text style={styles.ctaText}>Join a Circle</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 2: Mutual Aid */}
        <Text style={styles.sectionLabel}>Mutual Aid</Text>
        <Text style={styles.heading}>Give &amp; Receive</Text>

        {SEED_AID.map((a) => (
          <View
            key={a.id}
            style={[
              styles.aidCard,
              {
                borderLeftColor:
                  a.type === "offering"
                    ? FEAST_COLORS.teal
                    : FEAST_COLORS.coral,
              },
            ]}
          >
            <View style={styles.aidHeader}>
              <View
                style={[
                  styles.aidBadge,
                  {
                    backgroundColor:
                      a.type === "offering"
                        ? FEAST_COLORS.tealSoft
                        : FEAST_COLORS.coralSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.aidBadgeText,
                    {
                      color:
                        a.type === "offering"
                          ? FEAST_COLORS.teal
                          : FEAST_COLORS.coral,
                    },
                  ]}
                >
                  {a.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.aidName}>{a.name}</Text>
            </View>
            <Text style={styles.cardTitle}>{a.desc}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FEAST_COLORS.bgPage },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },

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
    marginBottom: 8,
  },

  circleCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: FEAST_COLORS.teal,
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "300",
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
  },
  cardMeta: { fontSize: 12, color: FEAST_COLORS.inkLight, marginTop: 4 },

  ctaButton: {
    backgroundColor: FEAST_COLORS.mustard,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ctaText: { fontSize: 12, fontWeight: "500", color: "#FFFFFF" },

  divider: {
    borderTopWidth: 1,
    borderTopColor: FEAST_COLORS.border,
    marginVertical: 12,
  },

  aidCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 14,
  },
  aidHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  aidBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aidBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  aidName: { fontSize: 11, color: FEAST_COLORS.inkLight },
});
