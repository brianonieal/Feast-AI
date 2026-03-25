// @version 1.2.0 - Prism: community insights page powered by @ANALYST
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";

interface CommunityHealthReport {
  date: string;
  totalReflections: number;
  totalEvents: number;
  totalMembers: number;
  topThemes: string[];
  sentimentSummary: string;
  regionalStrengths: Array<{ city: string; count: number }>;
  recommendations: string[];
  generatedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}

export default function InsightsPage() {
  const [report, setReport] = useState<CommunityHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyst/health");
      const data = (await res.json()) as {
        success?: boolean;
        report?: CommunityHealthReport;
        error?: string;
      };
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setError(data.error ?? "Failed to load report");
      }
    } catch {
      setError("Failed to connect to the API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Loading state — meaningful message since this takes 5-10s
  if (isLoading && !report) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4">
        <Sparkles size={24} className="text-mustard animate-pulse" />
        <p className="font-display italic font-light text-xl text-navy animate-pulse">
          Analyzing community patterns&hellip;
        </p>
        <p className="font-sans text-xs text-ink-light">
          This may take a few seconds
        </p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="py-12 text-center">
        <p className="font-sans text-sm text-coral">{error}</p>
        <button
          type="button"
          onClick={fetchReport}
          className="mt-4 font-sans text-xs font-medium text-mustard border border-mustard rounded-full px-4 py-2 hover:bg-mustard-soft transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  const maxRegionalCount = Math.max(
    ...report.regionalStrengths.map((r) => r.count),
    1
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
            Intelligence
          </p>
          <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
            Community Insights
          </h1>
        </div>
        <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-sm bg-navy/10 text-navy">
          Powered by @ANALYST
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <AdminStatCard
          label="Reflections"
          value={String(report.totalReflections)}
          color="teal"
        />
        <AdminStatCard
          label="Events"
          value={String(report.totalEvents)}
          color="mustard"
        />
        <AdminStatCard
          label="Members"
          value={String(report.totalMembers)}
          color="navy"
        />
        <AdminStatCard
          label="Report date"
          value={report.date}
          color="navy"
        />
      </div>

      {/* Top Themes */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-3">
          What the community cares about
        </p>
        <div className="flex flex-wrap gap-2">
          {report.topThemes.map((theme) => (
            <span
              key={theme}
              className="bg-navy text-white rounded-full px-5 py-2 font-sans text-sm"
            >
              {theme}
            </span>
          ))}
        </div>
      </section>

      {/* Sentiment summary */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
          Community sentiment
        </p>
        <div className="bg-card border border-border rounded-md py-3 pr-4 pl-4 border-l-[3px] border-l-teal">
          <p className="font-sans text-sm text-ink leading-relaxed">
            {report.sentimentSummary}
          </p>
        </div>
      </section>

      {/* Regional strengths */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
          Regional strengths
        </p>
        <AdminDataTable
          headers={["City", "Interest Count", ""]}
          rows={report.regionalStrengths.map((r) => [
            <span key={`city-${r.city}`} className="font-sans text-sm text-ink capitalize">
              {r.city}
            </span>,
            <span key={`count-${r.city}`} className="font-sans text-sm text-ink">
              {r.count}
            </span>,
            <div key={`bar-${r.city}`} className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all"
                style={{
                  width: `${Math.round((r.count / maxRegionalCount) * 100)}%`,
                }}
              />
            </div>,
          ])}
        />
      </section>

      {/* Recommendations */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-3">
          Recommended actions
        </p>
        <div className="space-y-3">
          {report.recommendations.map((rec, i) => (
            <div
              key={`rec-${i}`}
              className="bg-card border border-border rounded-md py-3 pr-4 pl-4 border-l-[3px] border-l-mustard"
            >
              <p className="font-display italic font-light text-[15px] text-navy leading-snug">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Refresh */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="font-sans text-xs text-ink-light">
          Report refreshes every 5 minutes. Last generated:{" "}
          {timeAgo(report.generatedAt)}
        </p>
        <button
          type="button"
          onClick={fetchReport}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-mustard border border-mustard rounded-full px-4 py-2 hover:bg-mustard-soft transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Analyzing..." : "Regenerate Report"}
        </button>
      </div>
    </div>
  );
}
