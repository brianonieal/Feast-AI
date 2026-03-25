// @version 1.4.0 - Harvest: member reflection journey page
// Personal page — any authenticated member, no tier restriction
// Fetches from GET /api/analytics/reflections/me
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";

interface ReflectionItem {
  id: string;
  text: string;
  eventName: string;
  eventCity: string;
  eventDate: string;
  createdAt: string;
}

interface ReflectionHistory {
  reflections: ReflectionItem[];
  totalCount: number;
  firstReflectionAt: string | null;
  streak: number;
}

export default function JourneyPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ReflectionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/reflections/me")
      .then((r) => r.json())
      .then((d: { data: ReflectionHistory }) => {
        setHistory(d.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-ink-light" />
      </div>
    );
  }

  // Derive display values
  const memberSince = history?.firstReflectionAt
    ? new Date(history.firstReflectionAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Just joined";

  const isEmpty = !history || history.totalCount === 0;

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-ink-light hover:text-ink transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Your Journey
        </h1>
      </div>

      {/* ─── Empty state ─── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="w-3 h-3 rounded-full bg-teal animate-pulse mb-6" />
          <h2 className="font-display italic font-light text-xl text-navy mb-2">
            Your journey starts at the table
          </h2>
          <p className="font-sans text-sm text-ink-light mb-6">
            Attend a dinner and share a reflection to begin.
          </p>
          <Link
            href="/events"
            className="font-sans text-sm font-medium text-mustard hover:text-mustard/80 transition-colors"
          >
            Find a dinner near you &rarr;
          </Link>
        </div>
      )}

      {/* ─── Stats row ─── */}
      {!isEmpty && history && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="font-display italic text-lg text-teal">
                {history.totalCount}
              </p>
              <p className="font-sans text-[10px] text-ink-light mt-0.5">
                Reflections Shared
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="font-display italic text-lg text-navy">
                {memberSince}
              </p>
              <p className="font-sans text-[10px] text-ink-light mt-0.5">
                Member Since
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="font-display italic text-lg text-mustard">
                {history.streak}
              </p>
              <p className="font-sans text-[10px] text-ink-light mt-0.5">
                Dinner Streak
              </p>
            </div>
          </div>

          {/* ─── Reflection timeline ─── */}
          <section className="space-y-3">
            <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light">
              Reflections
            </p>

            {history.reflections.map((r) => (
              <article
                key={r.id}
                className="bg-card border border-border rounded-md py-3 pr-4 pl-4 border-l-[3px] border-l-teal"
              >
                {/* Event name + city */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display italic text-[15px] text-navy">
                    {r.eventName}
                  </span>
                  <span className="font-sans text-xs text-ink-light">
                    {r.eventCity}
                  </span>
                </div>

                {/* Date */}
                <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
                  {new Date(r.eventDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {/* Reflection text — full, not truncated */}
                <p className="font-sans text-sm text-ink leading-relaxed">
                  {r.text}
                </p>

                {/* At event subline */}
                <p className="font-sans text-xs text-ink-light mt-2">
                  at {r.eventName}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
