// @version 0.5.0 - Echo: Library / The Pantry screen (mobile)
// Domain filter pills + ResourceCard list — warm linen design
import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEAST_COLORS, PANTRY_DOMAINS } from "@feast-ai/shared";

const SEED_RESOURCES = [
  { id: "r1", domain: "Personal Growth", title: "On Abundance & the Scarcity Myth", desc: "Exploring how abundance mindsets reshape community relationships." },
  { id: "r2", domain: "Land & Agriculture", title: "Regenerative Farming Primer", desc: "A practical introduction to soil health and community-supported agriculture." },
  { id: "r3", domain: "Community Finance", title: "Cooperative Ownership Models", desc: "How worker-owned cooperatives build shared wealth across generations." },
  { id: "r4", domain: "Creative Economy", title: "The Artist as Community Anchor", desc: "Case studies of artists driving neighborhood revitalization." },
  { id: "r5", domain: "Governance", title: "Community Decision-Making", desc: "Consent-based and sociocratic models for collective governance." },
];

export default function LibraryScreen(): React.JSX.Element {
  const [selected, setSelected] = useState<string>(PANTRY_DOMAINS[0]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>The Pantry</Text>
        <Text style={styles.heading}>Curated Resources</Text>

        {/* Domain filter pills — wrap layout */}
        <View style={styles.pillWrap}>
          {PANTRY_DOMAINS.map((domain) => (
            <Pressable
              key={domain}
              onPress={() => setSelected(domain)}
              style={[
                styles.pill,
                selected === domain
                  ? styles.pillActive
                  : styles.pillInactive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color:
                      selected === domain ? "#FFFFFF" : FEAST_COLORS.inkMid,
                  },
                ]}
              >
                {domain}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Resource cards */}
        {SEED_RESOURCES.map((r) => (
          <View key={r.id} style={styles.resourceCard}>
            <View style={styles.domainBadge}>
              <Text style={styles.domainText}>{r.domain.toUpperCase()}</Text>
            </View>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {r.desc}
            </Text>
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
  },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 6 },
  pillActive: { backgroundColor: FEAST_COLORS.teal },
  pillInactive: {
    backgroundColor: FEAST_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
  },
  pillText: { fontSize: 12, fontWeight: "500" },

  resourceCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: FEAST_COLORS.navy,
    padding: 14,
  },
  domainBadge: {
    backgroundColor: FEAST_COLORS.tealSoft,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  domainText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: FEAST_COLORS.teal,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "300",
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
  },
  cardDesc: { fontSize: 12, color: FEAST_COLORS.inkMid, marginTop: 4, lineHeight: 18 },
});
