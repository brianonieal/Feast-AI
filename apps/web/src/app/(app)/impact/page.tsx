// @version 2.0.0 - Pantheon: member-facing impact page
// Any authenticated member can view — community story + personal contribution
// Fetches: GET /api/analytics/impact + GET /api/analytics/reflections/me
"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Copy, Check } from "lucide-react";

interface ImpactMetrics {
  dinnersHosted: number;
  peopleConnected: number;
  citiesReached: number;
  reflectionsShared: number;
  campaignDinners: number;
  healthScore: number;
}

interface PersonalSnapshot {
  totalCount: number;
  streak: number;
}

export default function ImpactPage() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [personal, setPersonal] = useState<PersonalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/impact")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/analytics/reflections/me")
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([impact, refs]) => {
      setMetrics(impact?.report ?? impact ?? null);
      setPersonal(refs ?? null);
      setIsLoading(false);
    });
  }, []);

  const shareText = metrics
    ? `The Feast has hosted ${metrics.dinnersHosted} dinners connecting ${metrics.peopleConnected} people across ${metrics.citiesReached} cities. Join us → feastongood.com`
    : "";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareText]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 size={20} className="animate-spin text-teal" />
        <p className="font-sans text-sm text-ink-light">
          Loading community impact...
        </p>
      </div>
    );
  }

  const score = metrics?.healthScore ?? 0;
  const statusLabel =
    score >= 80 ? "Thriving" : score >= 50 ? "Growing" : "Emerging";
  const statusClass =
    score >= 80
      ? "bg-teal-soft text-teal"
      : score >= 50
        ? "bg-mustard-soft text-mustard"
        : "bg-coral-soft text-coral";

  const campaignPct = Math.min(
    100,
    Math.round(((metrics?.campaignDinners ?? 0) / 100) * 100)
  );

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Impact
        </h1>
        <p className="font-sans text-[13px] text-ink-light mt-1">
          How The Feast is growing
        </p>
      </div>

      {/* Community health hero */}
      <div className="bg-navy rounded-xl p-8 text-center">
        <p className="font-display italic text-[72px] text-white leading-none">
          {score}
        </p>
        <p className="text-white/70 text-sm mt-2">Community Health Score</p>
        <span
          className={`inline-block mt-3 text-xs font-medium px-3 py-1 rounded-full ${statusClass}`}
        >
          {statusLabel}
        </span>
        <p className="text-white/50 text-xs mt-4">
          Across {metrics?.citiesReached ?? 0} cities,{" "}
          {metrics?.peopleConnected ?? 0} people have shared a meal.
        </p>
      </div>

      {/* Personal contribution */}
      {personal && (
        <section>
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-3">
            Your Contribution
          </p>
          <div className="flex gap-3">
            <span className="bg-teal-soft text-teal text-xs font-medium px-4 py-2 rounded-full">
              {personal.totalCount} reflections
            </span>
            <span className="bg-mustard-soft text-mustard text-xs font-medium px-4 py-2 rounded-full">
              {personal.streak} dinners attended
            </span>
          </div>
        </section>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={metrics?.dinnersHosted ?? 0} label="Dinners" color="text-teal" />
        <StatCard value={metrics?.peopleConnected ?? 0} label="Connected" color="text-navy" />
        <StatCard value={metrics?.citiesReached ?? 0} label="Cities" color="text-mustard" />
        <StatCard value={metrics?.reflectionsShared ?? 0} label="Reflections" color="text-teal" />
      </div>

      {/* 100 Dinners Campaign */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-3">
          100 Dinners Campaign
        </p>
        <div className="h-10 bg-[var(--bg-surface)] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500"
            style={{ width: `${campaignPct}%` }}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
              campaignPct > 15 ? "text-white" : "text-ink"
            }`}
          >
            {metrics?.campaignDinners ?? 0} / 100 dinners ({campaignPct}%)
          </span>
        </div>
        <p className="font-sans text-xs text-ink-light text-center mt-2">
          Goal: 100 dinners across America
        </p>
      </section>

      {/* Share section */}
      <section className="bg-card border border-border rounded-lg p-4">
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
          Share the Mission
        </p>
        <p className="font-sans text-sm text-ink leading-relaxed mb-3">
          {shareText || "Loading..."}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-mustard border border-mustard rounded-full px-3 py-1 hover:bg-mustard-soft/50 transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy to clipboard
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 text-center">
      <p className={`font-display italic text-2xl ${color}`}>{value}</p>
      <p className="font-sans text-[10px] text-ink-light mt-1">{label}</p>
    </div>
  );
}
