// @version 0.9.0 - Lens: admin events management page
// Data-heavy: stats row, filter strip, data table
// Client-side data fetching via useEffect + useState
"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EventStatusBadge } from "@/components/admin/EventStatusBadge";

type EventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "MARKETED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

interface AdminEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  capacity: number;
  status: EventStatus;
  hostName: string;
  confirmedSeats: number;
}

const STATUS_OPTIONS: EventStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "MARKETED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");

  useEffect(() => {
    fetch("/api/admin/events?limit=50")
      .then((r) => r.json())
      .then((d: { data: AdminEvent[] }) => {
        setEvents(d.data ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Derive stats client-side from the events array
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = events.filter((e) => new Date(e.date) >= monthStart);
    const open = events.filter(
      (e) => e.status === "MARKETED" || e.status === "LIVE"
    );
    const totalSeats = events.reduce((s, e) => s + e.confirmedSeats, 0);
    const avgAttendance =
      events.length > 0 ? Math.round(totalSeats / events.length) : 0;
    const openRsvps = open.reduce((s, e) => s + e.confirmedSeats, 0);

    return {
      total: events.length,
      thisMonth: thisMonth.length,
      avgAttendance,
      openRsvps,
    };
  }, [events]);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedStatus !== "All" && e.status !== selectedStatus) return false;
      if (selectedCity !== "All" && e.city !== selectedCity) return false;
      return true;
    });
  }, [events, selectedStatus, selectedCity]);

  // Unique cities for filter
  const cities = useMemo(() => {
    const set = new Set(events.map((e) => e.city));
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  // Format date for display
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Table rows
  const rows = filteredEvents.map((e) => [
    <span key="date" className="font-sans text-xs text-ink-mid">
      {fmtDate(e.date)}
    </span>,
    <span key="title" className="font-display italic text-[15px] text-navy">
      {e.name}
    </span>,
    <span key="host" className="font-sans text-xs text-ink-mid">
      {e.hostName}
    </span>,
    <span key="city" className="font-sans text-xs text-ink-mid">
      {e.city}
    </span>,
    <span key="seats" className="font-sans text-xs text-ink-mid">
      {e.confirmedSeats} / {e.capacity}
    </span>,
    <EventStatusBadge key="status" status={e.status} />,
    <button
      key="action"
      type="button"
      onClick={() => console.log("[AdminEvents] manage:", e.id)}
      className="font-sans text-xs font-medium text-mustard border border-mustard/30 rounded-full px-3 py-1 hover:bg-mustard-soft transition-colors"
    >
      Manage
    </button>,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
            Manage
          </p>
          <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
            Events
          </h1>
        </div>
        <button
          type="button"
          onClick={() => console.log("[AdminEvents] new event")}
          className="font-sans text-xs font-medium text-white bg-mustard rounded-full px-4 py-2 hover:bg-mustard/90 transition-colors"
        >
          New Event
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <AdminStatCard label="Total Events" value={stats.total} color="navy" />
        <AdminStatCard
          label="This Month"
          value={stats.thisMonth}
          color="teal"
        />
        <AdminStatCard
          label="Avg Attendance"
          value={stats.avgAttendance}
          color="mustard"
        />
        <AdminStatCard
          label="Open RSVPs"
          value={stats.openRsvps}
          color="teal"
        />
      </div>

      {/* Filter strip */}
      <div className="space-y-2">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {["All", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-sans font-medium transition-colors ${
                selectedStatus === s
                  ? "bg-mustard text-white"
                  : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-mustard/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* City pills */}
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCity(c)}
              className={`rounded-full px-3 py-1 text-xs font-sans font-medium transition-colors ${
                selectedCity === c
                  ? "bg-teal text-white"
                  : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-teal/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Events table */}
      <AdminDataTable
        headers={["Date", "Title", "Host", "City", "Seats", "Status", "Actions"]}
        rows={rows}
        isLoading={isLoading}
        emptyMessage="No events found"
      />
    </div>
  );
}
