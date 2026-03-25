// @version 1.4.0 - Harvest: admin impact dashboard
// Health score hero + impact stats + 100 Dinners campaign + PDF export
"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { useUserStore } from "@/stores/useUserStore";

interface ImpactMetrics {
  dinnersHosted: number;
  peopleConnected: number;
  citiesReached: number;
  reflectionsShared: number;
  hostsActive: number;
  facilitatorsActive: number;
  campaignDinners: number;
  campaignGoal: number;
  campaignPercent: number;
  newMembersThisMonth: number;
  newEventsThisMonth: number;
  avgAttendanceRate: number;
  healthScore: number;
  generatedAt: string;
}

export default function AdminImpactPage() {
  const user = useUserStore((s) => s.user);
  const isFoundingTable = user?.tier === "founding_table";

  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/impact")
      .then((r) => r.json())
      .then((d: { data: ImpactMetrics }) => {
        setMetrics(d.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/analytics/funder-report/export", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "feast-impact-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setPdfError("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-ink-light" />
      </div>
    );
  }

  const healthLabel =
    metrics.healthScore >= 80
      ? "Thriving"
      : metrics.healthScore >= 50
        ? "Growing"
        : "Emerging";

  const healthBadge =
    metrics.healthScore >= 80
      ? "bg-teal-soft text-teal"
      : metrics.healthScore >= 50
        ? "bg-mustard-soft text-mustard"
        : "bg-coral-soft text-coral";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Analytics
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Impact
        </h1>
      </div>

      {/* ─── Health score hero card ─── */}
      <div className="bg-navy rounded-xl p-8 flex items-center justify-between">
        <div>
          <p className="font-display italic text-[72px] text-white leading-none">
            {metrics.healthScore}
          </p>
          <p className="font-sans text-sm text-white/70 mt-2">
            Community Health Score
          </p>
          <span
            className={`inline-block mt-2 font-sans text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${healthBadge}`}
          >
            {healthLabel}
          </span>
        </div>
        <div className="text-right max-w-[200px]">
          <p className="font-sans text-xs text-white/50 leading-relaxed">
            Weighted across 5 dimensions: dinner activity, reflection
            engagement, host network, attendance quality, and growth momentum.
          </p>
        </div>
      </div>

      {/* ─── Impact stats grid ─── */}
      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard
          label="Dinners Hosted"
          value={metrics.dinnersHosted}
          color="teal"
        />
        <AdminStatCard
          label="People Connected"
          value={metrics.peopleConnected}
          color="navy"
        />
        <AdminStatCard
          label="Cities Reached"
          value={metrics.citiesReached}
          color="mustard"
        />
        <AdminStatCard
          label="Reflections"
          value={metrics.reflectionsShared}
          color="teal"
        />
        <AdminStatCard
          label="Active Hosts"
          value={metrics.hostsActive}
          color="navy"
        />
        <AdminStatCard
          label="Facilitators"
          value={metrics.facilitatorsActive}
          color="mustard"
        />
      </div>

      {/* ─── 100 Dinners Campaign ─── */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-3">
          100 Dinners Campaign
        </p>

        {/* Progress bar */}
        <div className="w-full h-10 bg-[var(--bg-surface)] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500"
            style={{ width: `${Math.max(2, metrics.campaignPercent)}%` }}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center font-sans text-sm font-medium ${
              metrics.campaignPercent > 15 ? "text-white" : "text-ink"
            }`}
          >
            {metrics.campaignDinners} / 100 dinners (
            {metrics.campaignPercent.toFixed(0)}%)
          </span>
        </div>

        <p className="font-sans text-xs text-ink-light mt-2">
          Goal: 100 dinners across America
        </p>
      </div>

      {/* ─── Monthly growth ─── */}
      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard
          label="New Members This Month"
          value={metrics.newMembersThisMonth}
          color="teal"
        />
        <AdminStatCard
          label="New Events This Month"
          value={metrics.newEventsThisMonth}
          color="navy"
        />
        <AdminStatCard
          label="Avg Attendance"
          value={`${metrics.avgAttendanceRate}%`}
          color="mustard"
        />
      </div>

      {/* ─── Funder report export (founding_table only) ─── */}
      {isFoundingTable && (
        <div className="border-t border-border pt-6">
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
            Funder Report
          </p>
          <p className="font-sans text-sm text-ink-mid mb-4">
            Generate a branded PDF report for stakeholders and funders.
          </p>

          {pdfError && (
            <p className="font-sans text-sm text-coral mb-3">{pdfError}</p>
          )}

          <button
            type="button"
            onClick={handlePdfDownload}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 font-sans text-sm font-medium text-white bg-mustard rounded-full px-5 py-2.5 hover:bg-mustard/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {pdfLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
