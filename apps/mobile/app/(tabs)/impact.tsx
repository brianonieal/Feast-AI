// @version 2.0.0 - Pantheon: Impact tab — personal journey + community metrics
// 5th tab in mobile app. Two sections toggled by pill switcher.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEAST_COLORS } from "@feast-ai/shared";

// ESCAPE: Expo env vars accessed via process.env at build time
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Section = "personal" | "community";

interface ReflectionItem {
  id: string;
  eventName: string;
  eventCity: string;
  text: string;
  createdAt: string;
}

export default function ImpactScreen(): React.JSX.Element {
  const [section, setSection] = useState<Section>("personal");
  const [metrics, setMetrics] = useState<Record<string, number | string> | null>(null);
  const [reflections, setReflections] = useState<{
    totalCount: number;
    streak: number;
    reflections: ReflectionItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/analytics/impact`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API_URL}/api/analytics/reflections/me`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([impact, refs]) => {
      setMetrics(impact?.report ?? impact ?? null);
      setReflections(refs ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={FEAST_COLORS.teal} />
          <Text style={styles.loadingText}>Loading your impact...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Section toggle */}
        <View style={styles.toggle}>
          {(["personal", "community"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.toggleBtn, section === s && styles.toggleActive]}
              onPress={() => setSection(s)}
            >
              <Text
                style={[
                  styles.toggleText,
                  section === s && styles.toggleTextActive,
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {section === "personal" ? (
          <PersonalSection data={reflections} />
        ) : (
          <CommunitySection data={metrics} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Personal Section ───

function PersonalSection({
  data,
}: {
  data: {
    totalCount: number;
    streak: number;
    reflections: ReflectionItem[];
  } | null;
}) {
  return (
    <View style={styles.section}>
      {/* Stats */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.teal }]}>
            {data?.totalCount ?? 0}
          </Text>
          <Text style={styles.statLabel}>Reflections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.mustard }]}>
            {data?.streak ?? 0} dinners
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      {/* Timeline */}
      <Text style={styles.sectionLabel}>YOUR JOURNEY</Text>
      {!data?.reflections?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Your journey starts at the table
          </Text>
          <Text style={styles.emptyBody}>
            Attend a dinner and share a reflection to begin.
          </Text>
        </View>
      ) : (
        data.reflections.map((r) => (
          <View key={r.id} style={styles.reflectionCard}>
            <View style={styles.reflectionAccent} />
            <View style={styles.reflectionContent}>
              <Text style={styles.reflectionEvent}>{r.eventName}</Text>
              <Text style={styles.reflectionMeta}>{r.eventCity}</Text>
              <Text style={styles.reflectionText}>{r.text}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Community Section ───

function CommunitySection({
  data,
}: {
  data: Record<string, number | string> | null;
}) {
  const campaign = Number(data?.campaignDinners ?? 0);
  const goal = 100;
  const pct = Math.min(1, campaign / goal);
  const healthScore = Number(data?.healthScore ?? 0);

  const statusLabel =
    healthScore >= 80 ? "Thriving" : healthScore >= 50 ? "Growing" : "Emerging";

  return (
    <View style={styles.section}>
      {/* Health score hero */}
      <View style={styles.healthCard}>
        <Text style={styles.healthScore}>{healthScore}</Text>
        <Text style={styles.healthLabel}>Community Health Score</Text>
        <Text style={styles.healthStatus}>{statusLabel}</Text>
      </View>

      {/* Stats 2x2 */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.teal }]}>
            {data?.dinnersHosted ?? 0}
          </Text>
          <Text style={styles.statLabel}>Dinners</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.navy }]}>
            {data?.peopleConnected ?? 0}
          </Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.mustard }]}>
            {data?.citiesReached ?? 0}
          </Text>
          <Text style={styles.statLabel}>Cities</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: FEAST_COLORS.teal }]}>
            {data?.reflectionsShared ?? 0}
          </Text>
          <Text style={styles.statLabel}>Reflections</Text>
        </View>
      </View>

      {/* 100 Dinners Campaign */}
      <Text style={styles.sectionLabel}>100 DINNERS CAMPAIGN</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(pct * 100)}%` as unknown as number },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>{campaign} / 100 dinners</Text>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FEAST_COLORS.bgPage },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: FEAST_COLORS.inkLight, fontSize: 13 },

  // Toggle
  toggle: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 8,
    backgroundColor: FEAST_COLORS.bgCard,
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: FEAST_COLORS.mustard },
  toggleText: { fontSize: 13, color: FEAST_COLORS.inkLight, fontWeight: "500" },
  toggleTextActive: { color: "white" },

  // Shared
  section: { padding: 16 },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: FEAST_COLORS.mustard,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: FEAST_COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "300", fontStyle: "italic", marginBottom: 4 },
  statLabel: { fontSize: 11, color: FEAST_COLORS.inkLight },

  // Health card
  healthCard: {
    backgroundColor: FEAST_COLORS.navy,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  healthScore: {
    fontSize: 64,
    fontWeight: "300",
    color: "white",
    lineHeight: 72,
  },
  healthLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 4,
  },
  healthStatus: {
    color: FEAST_COLORS.teal,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },

  // Progress bar
  progressBar: {
    height: 20,
    backgroundColor: FEAST_COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: FEAST_COLORS.teal,
    borderRadius: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: FEAST_COLORS.inkLight,
    textAlign: "center",
  },

  // Reflections
  reflectionCard: {
    flexDirection: "row",
    backgroundColor: FEAST_COLORS.bgCard,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: FEAST_COLORS.border,
    overflow: "hidden",
  },
  reflectionAccent: { width: 3, backgroundColor: FEAST_COLORS.teal },
  reflectionContent: { flex: 1, padding: 12 },
  reflectionEvent: {
    fontSize: 13,
    fontWeight: "600",
    color: FEAST_COLORS.navy,
  },
  reflectionMeta: {
    fontSize: 11,
    color: FEAST_COLORS.inkLight,
    marginBottom: 6,
  },
  reflectionText: {
    fontSize: 13,
    color: FEAST_COLORS.inkDark,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    fontSize: 17,
    fontStyle: "italic",
    color: FEAST_COLORS.navy,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: FEAST_COLORS.inkLight,
    textAlign: "center",
  },
});
