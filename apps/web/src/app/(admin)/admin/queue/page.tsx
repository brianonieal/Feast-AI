// @version 0.9.0 - Lens: admin content approval queue page
// Card-based layout (not table) — each item gets ApprovalQueueCard
// Optimistic removal on approve/reject
"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ApprovalQueueCard } from "@/components/admin/ApprovalQueueCard";
import { LoadingState } from "@/components/ui/LoadingState";

interface QueueItem {
  id: string;
  eventName: string;
  eventDate: string;
  city: string;
  channel: string;
  generatedTitle: string | null;
  generatedBody: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  publishedAt?: string | null;
}

const CHANNELS = [
  "All",
  "WEBSITE_ARTICLE",
  "INSTAGRAM",
  "CIRCLE_RECAP",
  "NEWSLETTER",
  "EMAIL_CAMPAIGN",
] as const;

export default function AdminQueuePage() {
  const [allItems, setAllItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>("All");

  useEffect(() => {
    fetch("/api/admin/queue?limit=100")
      .then((r) => r.json())
      .then((d: { data: QueueItem[] }) => {
        setAllItems(d.data ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Derive stats client-side
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = allItems.filter((i) => i.status === "PENDING").length;
    const approvedToday = allItems.filter(
      (i) =>
        i.status === "APPROVED" &&
        i.reviewedAt &&
        new Date(i.reviewedAt) >= today
    ).length;
    const publishedToday = allItems.filter(
      (i) =>
        i.status === "PUBLISHED" &&
        i.publishedAt &&
        new Date(i.publishedAt) >= today
    ).length;

    return { pending, approvedToday, publishedToday };
  }, [allItems]);

  // Only show PENDING items as cards
  const pendingItems = useMemo(() => {
    return allItems
      .filter((i) => i.status === "PENDING")
      .filter(
        (i) => selectedChannel === "All" || i.channel === selectedChannel
      );
  }, [allItems, selectedChannel]);

  // Optimistic approve — remove card immediately
  const handleApprove = async (id: string) => {
    setAllItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "APPROVED" } : i))
    );

    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId: id, action: "approve" }),
      });
    } catch (err) {
      console.error("[AdminQueue] approve failed:", err);
    }
  };

  // Optimistic reject — remove card immediately
  const handleReject = async (id: string) => {
    setAllItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "REJECTED" } : i))
    );

    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId: id, action: "reject" }),
      });
    } catch (err) {
      console.error("[AdminQueue] reject failed:", err);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Content
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Approval Queue
        </h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard
          label="Pending Review"
          value={stats.pending}
          color={stats.pending > 0 ? "coral" : "navy"}
        />
        <AdminStatCard
          label="Approved Today"
          value={stats.approvedToday}
          color="teal"
        />
        <AdminStatCard
          label="Published Today"
          value={stats.publishedToday}
          color="teal"
        />
      </div>

      {/* Channel filter pills */}
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setSelectedChannel(ch)}
            className={`rounded-full px-3 py-1 text-xs font-sans font-medium transition-colors ${
              selectedChannel === ch
                ? "bg-mustard text-white"
                : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-mustard/40"
            }`}
          >
            {ch === "All" ? "All" : ch.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Queue cards */}
      {pendingItems.length > 0 ? (
        <div className="space-y-3">
          {pendingItems.map((item) => (
            <ApprovalQueueCard
              key={item.id}
              id={item.id}
              eventName={item.eventName}
              eventDate={item.eventDate}
              channel={item.channel}
              generatedTitle={item.generatedTitle}
              generatedBody={item.generatedBody}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-teal inline-block" />
            <p className="font-display italic font-light text-xl text-ink-light">
              No content awaiting review
            </p>
          </div>
          <p className="font-sans text-sm text-ink-light">All caught up.</p>
        </div>
      )}
    </div>
  );
}
