// @version 0.5.0 - Echo: Events / The Arc screen (mobile)
// City filter pills + EventCard list — warm linen design
import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEAST_COLORS } from "@feast-ai/shared";

const CITIES = ["All", "Brooklyn", "LA", "DC", "Chicago"] as const;

const SEED_EVENTS = [
  { id: "e1", title: "Brooklyn Spring Dinner", loc: "Fort Greene", month: "APR", day: "12", seats: "8/12", status: "open" as const },
  { id: "e2", title: "LA Westside Feast", loc: "Venice Canals", month: "APR", day: "15", seats: "16/16", status: "full" as const },
  { id: "e3", title: "Meditation Rooftop", loc: "Williamsburg Loft", month: "APR", day: "18", seats: "7/10", status: "confirmed" as const },
  { id: "e4", title: "Lincoln Bridge Supper", loc: "Adams Morgan", month: "APR", day: "22", seats: "3/8", status: "open" as const },
];

const STATUS_COLORS = {
  open: { bg: FEAST_COLORS.tealSoft, text: FEAST_COLORS.teal, label: "OPEN" },
  confirmed: { bg: FEAST_COLORS.mustardSoft, text: FEAST_COLORS.mustard, label: "CONFIRMED" },
  full: { bg: FEAST_COLORS.bgSurface, text: FEAST_COLORS.inkLight, label: "FULL" },
};

export default function EventsScreen(): React.JSX.Element {
  const [city, setCity] = useState<string>("All");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>The Arc</Text>
        <Text style={styles.heading}>Upcoming Gatherings</Text>

        {/* City filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {CITIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCity(c)}
              style={[
                styles.pill,
                city === c ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: city === c ? "#FFFFFF" : FEAST_COLORS.inkMid },
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Event cards */}
        {SEED_EVENTS.map((ev) => {
          const s = STATUS_COLORS[ev.status];
          return (
            <View
              key={ev.id}
              style={[
                styles.eventCard,
                {
                  borderLeftColor:
                    ev.status === "full"
                      ? FEAST_COLORS.border
                      : FEAST_COLORS.mustard,
                },
              ]}
            >
              {/* Date block */}
              <View style={styles.dateBlock}>
                <Text style={styles.dateMonth}>{ev.month}</Text>
                <Text style={styles.dateDay}>{ev.day}</Text>
              </View>

              {/* Details */}
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text style={styles.eventMeta}>{ev.loc}</Text>
                <Text style={styles.eventMeta}>{ev.seats} seats</Text>
              </View>

              {/* Status badge */}
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>
                  {s.label}
                </Text>
              </View>
            </View>
          );
        })}
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

  pillRow: { gap: 8, paddingVertical: 4 },
  pill: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 6 },
  pillActive: { backgroundColor: FEAST_COLORS.mustard },
  pillInactive: {
    backgroundColor: FEAST_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
  },
  pillText: { fontSize: 12, fontWeight: "500" },

  eventCard: {
    backgroundColor: FEAST_COLORS.bgCard,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBlock: {
    width: 44,
    backgroundColor: FEAST_COLORS.mustardSoft,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    color: FEAST_COLORS.mustard,
  },
  dateDay: { fontSize: 16, fontWeight: "700", color: FEAST_COLORS.mustard },
  eventDetails: { flex: 1 },
  eventTitle: {
    fontSize: 15,
    fontWeight: "300",
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
  },
  eventMeta: { fontSize: 12, color: FEAST_COLORS.inkLight, marginTop: 2 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
});
