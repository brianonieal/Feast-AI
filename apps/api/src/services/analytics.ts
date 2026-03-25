// @version 1.4.0 - Harvest
// Aggregates platform metrics from existing DB tables
// No new schema needed — all data already exists

import { db } from "../lib/db";

export interface ImpactMetrics {
  // Core impact numbers
  dinnersHosted: number;
  peopleConnected: number;
  citiesReached: number;
  reflectionsShared: number;
  hostsActive: number;
  facilitatorsActive: number;

  // Campaign progress
  campaignDinners: number; // toward 100 Dinners goal
  campaignGoal: number; // 100
  campaignPercent: number; // 0-100

  // Growth
  newMembersThisMonth: number;
  newEventsThisMonth: number;
  avgAttendanceRate: number; // confirmed / capacity * 100

  // Community health score
  healthScore: number; // 0-100

  // Timestamp
  generatedAt: Date;
}

export interface ReflectionHistory {
  reflections: Array<{
    id: string;
    text: string;
    eventName: string;
    eventCity: string;
    eventDate: Date;
    createdAt: Date;
  }>;
  totalCount: number;
  firstReflectionAt: Date | null;
  streak: number; // consecutive events with reflections
}

export async function getImpactMetrics(): Promise<ImpactMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    dinnersHosted,
    attendanceData,
    citiesReached,
    reflectionsShared,
    hostsActive,
    facilitatorsActive,
    newMembers,
    newEvents,
    completedEvents,
  ] = await Promise.all([
    // Completed dinners
    db.feastEvent.count({ where: { status: "COMPLETED" } }),

    // Total attendances (people connected) — CONFIRMED status
    db.eventAttendance.count({ where: { status: "CONFIRMED" } }),

    // Unique cities with completed events
    db.feastEvent.findMany({
      where: { status: "COMPLETED" },
      select: { city: true },
      distinct: ["city"],
    }),

    // Total reflections
    db.reflection.count(),

    // Active hosts (approved applications)
    db.application.count({
      where: { role: "HOST", status: "APPROVED" },
    }),

    // Active facilitators
    db.application.count({
      where: { role: "FACILITATOR", status: "APPROVED" },
    }),

    // New members this month
    db.user.count({ where: { createdAt: { gte: monthStart } } }),

    // New events this month
    db.feastEvent.count({ where: { createdAt: { gte: monthStart } } }),

    // Completed events with attendance count for avg rate
    // NOTE: Prisma doesn't allow select + include in same query
    // Use include only — capacity is always present on the model
    db.feastEvent.findMany({
      where: { status: "COMPLETED" },
      include: { _count: { select: { attendances: true } } },
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Avg attendance rate
  const avgAttendanceRate =
    completedEvents.length > 0
      ? completedEvents.reduce((sum, e) => {
          const rate =
            e.capacity > 0 ? (e._count.attendances / e.capacity) * 100 : 0;
          return sum + rate;
        }, 0) / completedEvents.length
      : 0;

  // Community health score (0-100)
  const healthScore = calculateHealthScore({
    dinnersHosted,
    reflectionsShared,
    hostsActive,
    avgAttendanceRate,
    newMembersThisMonth: newMembers,
  });

  return {
    dinnersHosted,
    peopleConnected: attendanceData,
    citiesReached: citiesReached.length,
    reflectionsShared,
    hostsActive,
    facilitatorsActive,
    campaignDinners: dinnersHosted,
    campaignGoal: 100,
    campaignPercent: Math.min(100, (dinnersHosted / 100) * 100),
    newMembersThisMonth: newMembers,
    newEventsThisMonth: newEvents,
    avgAttendanceRate: Math.round(avgAttendanceRate),
    healthScore,
    generatedAt: now,
  };
}

function calculateHealthScore(params: {
  dinnersHosted: number;
  reflectionsShared: number;
  hostsActive: number;
  avgAttendanceRate: number;
  newMembersThisMonth: number;
}): number {
  // Weighted score across 5 dimensions (each max 20 points)
  const dimensions = [
    // Dinner activity (20pts): 10+ dinners = full score
    Math.min(20, (params.dinnersHosted / 10) * 20),
    // Reflection engagement (20pts): 50%+ reflection rate = full
    Math.min(
      20,
      (params.reflectionsShared /
        Math.max(1, params.dinnersHosted * 6)) *
        20
    ),
    // Host network (20pts): 5+ active hosts = full
    Math.min(20, (params.hostsActive / 5) * 20),
    // Attendance quality (20pts): 80%+ fill rate = full
    Math.min(20, (params.avgAttendanceRate / 80) * 20),
    // Growth momentum (20pts): 5+ new members/month = full
    Math.min(20, (params.newMembersThisMonth / 5) * 20),
  ];

  return Math.round(dimensions.reduce((sum, d) => sum + d, 0));
}

export async function getMemberReflectionHistory(
  userId: string
): Promise<ReflectionHistory> {
  const reflections = await db.reflection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: { name: true, city: true, date: true },
      },
    },
  });

  // Calculate streak — simplified: count for now, full streak logic v1.5.0
  const streak =
    reflections.length > 0 ? Math.min(reflections.length, 7) : 0;

  return {
    reflections: reflections.map((r) => ({
      id: r.id,
      text: r.text,
      eventName: r.event?.name ?? "A Feast Dinner",
      eventCity: r.event?.city ?? "",
      eventDate: r.event?.date ?? r.createdAt,
      createdAt: r.createdAt,
    })),
    totalCount: reflections.length,
    firstReflectionAt:
      reflections.length > 0
        ? (reflections[reflections.length - 1]?.createdAt ?? null)
        : null,
    streak,
  };
}

/**
 * Get campaign-specific data with city breakdown.
 */
export async function getCampaignData() {
  const [dinnersByCity, totalDinners] = await Promise.all([
    db.feastEvent.groupBy({
      by: ["city"],
      where: { status: "COMPLETED" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    db.feastEvent.count({ where: { status: "COMPLETED" } }),
  ]);

  return {
    total: totalDinners,
    goal: 100,
    percent: Math.min(100, (totalDinners / 100) * 100),
    byCity: dinnersByCity.map((c) => ({
      city: c.city,
      count: c._count.id,
    })),
  };
}
