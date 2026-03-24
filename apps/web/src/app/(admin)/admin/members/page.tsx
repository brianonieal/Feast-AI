// @version 0.9.0 - Lens: admin members page
// Three sections: Applications + Member Intents + Regional Interest
// Single API call fetches all three datasets
"use client";

import { useState, useEffect, useMemo } from "react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { MemberIntentBadge } from "@/components/admin/MemberIntentBadge";
import { LoadingState } from "@/components/ui/LoadingState";

interface Application {
  id: string;
  name: string;
  city: string;
  role: string;
  status: string;
  createdAt: string;
}

interface MemberIntent {
  id: string;
  name: string | null;
  email: string | null;
  intent: string;
  confidence: number;
  city: string | null;
  source: string;
  createdAt: string;
}

interface RegionalInterest {
  city: string;
  count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  HOST: { bg: "bg-mustard-soft", text: "text-mustard" },
  FACILITATOR: { bg: "bg-teal-soft", text: "text-teal" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-mustard-soft", text: "text-mustard" },
  APPROVED: { bg: "bg-teal-soft", text: "text-teal" },
  REJECTED: { bg: "bg-coral-soft", text: "text-coral" },
};

export default function AdminMembersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [intents, setIntents] = useState<MemberIntent[]>([]);
  const [regions, setRegions] = useState<RegionalInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/members?limit=50")
      .then((r) => r.json())
      .then(
        (d: {
          data: {
            applications: Application[];
            intents: MemberIntent[];
            regions: RegionalInterest[];
          };
        }) => {
          setApplications(d.data.applications ?? []);
          setIntents(d.data.intents ?? []);
          setRegions(d.data.regions ?? []);
          setIsLoading(false);
        }
      )
      .catch(() => setIsLoading(false));
  }, []);

  // Application stats
  const appStats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "PENDING").length;
    const approved = applications.filter((a) => a.status === "APPROVED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    return { pending, approved, rejected };
  }, [applications]);

  // Optimistic approve/reject
  const handleAppAction = async (id: string, action: "approve" | "reject") => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: action === "approve" ? "APPROVED" : "REJECTED" }
          : a
      )
    );

    try {
      await fetch(`/api/admin/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch (err) {
      console.error("[AdminMembers] action failed:", err);
    }
  };

  // Max region count for bar sizing
  const maxRegionCount = useMemo(
    () => Math.max(1, ...regions.map((r) => r.count)),
    [regions]
  );

  if (isLoading) return <LoadingState />;

  // Application table rows
  const appRows = applications.map((a) => {
    const roleDef = ROLE_STYLES[a.role];
    const roleBg = roleDef?.bg ?? "bg-[var(--bg-surface)]";
    const roleText = roleDef?.text ?? "text-ink-mid";
    const statusDef = STATUS_STYLES[a.status];
    const statusBg = statusDef?.bg ?? "bg-[var(--bg-surface)]";
    const statusText = statusDef?.text ?? "text-ink-mid";
    return [
      <span key="name" className="font-sans text-sm font-medium text-ink">
        {a.name}
      </span>,
      <span key="city" className="font-sans text-xs text-ink-mid">
        {a.city}
      </span>,
      <span
        key="role"
        className={`inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${roleBg} ${roleText}`}
      >
        {a.role}
      </span>,
      <span
        key="status"
        className={`inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusBg} ${statusText}`}
      >
        {a.status}
      </span>,
      <span key="date" className="font-sans text-xs text-ink-light">
        {timeAgo(a.createdAt)}
      </span>,
      a.status === "PENDING" ? (
        <div key="actions" className="flex gap-1.5">
          <button
            type="button"
            onClick={() => handleAppAction(a.id, "approve")}
            className="font-sans text-[10px] font-medium text-teal border border-teal/30 rounded-full px-2.5 py-0.5 hover:bg-teal-soft transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => handleAppAction(a.id, "reject")}
            className="font-sans text-[10px] font-medium text-coral border border-coral/30 rounded-full px-2.5 py-0.5 hover:bg-coral-soft transition-colors"
          >
            Reject
          </button>
        </div>
      ) : (
        <span key="actions" className="font-sans text-xs text-ink-light">
          —
        </span>
      ),
    ];
  });

  // Intent table rows
  const intentRows = intents.map((i) => [
    <span key="name" className="font-sans text-sm text-ink">
      {i.name ?? "—"}
    </span>,
    <span key="email" className="font-sans text-xs text-ink-mid truncate max-w-[160px] inline-block">
      {i.email ?? "—"}
    </span>,
    <MemberIntentBadge key="intent" intent={i.intent} />,
    <span key="conf" className="font-sans text-xs text-ink-mid">
      {Math.round(i.confidence * 100)}%
    </span>,
    <span key="city" className="font-sans text-xs text-ink-mid">
      {i.city ?? "—"}
    </span>,
    <span key="source" className="font-sans text-xs text-ink-light">
      {titleCase(i.source)}
    </span>,
    <span key="date" className="font-sans text-xs text-ink-light">
      {timeAgo(i.createdAt)}
    </span>,
  ]);

  // Regional interest rows
  const regionRows = regions.map((r) => [
    <span key="city" className="font-sans text-sm text-ink">
      {titleCase(r.city)}
    </span>,
    <div key="count" className="flex items-center gap-2">
      <span className="font-sans text-xs text-ink-mid w-6 text-right">
        {r.count}
      </span>
      <div className="flex-1 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
        <div
          className="h-full bg-teal rounded-full"
          style={{ width: `${(r.count / maxRegionCount) * 100}%` }}
        />
      </div>
    </div>,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Manage
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Members
        </h1>
      </div>

      {/* ─── SECTION 1: Applications ─── */}
      <section>
        <h2 className="font-display italic font-light text-xl text-navy mb-4">
          Applications
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <AdminStatCard
            label="Pending"
            value={appStats.pending}
            color="mustard"
          />
          <AdminStatCard
            label="Approved"
            value={appStats.approved}
            color="teal"
          />
          <AdminStatCard
            label="Rejected"
            value={appStats.rejected}
            color="coral"
          />
        </div>

        <AdminDataTable
          headers={["Name", "City", "Role", "Status", "Submitted", "Actions"]}
          rows={appRows}
          emptyMessage="No applications yet"
        />
      </section>

      <div className="border-t border-border my-8" />

      {/* ─── SECTION 2: Member Intents ─── */}
      <section>
        <h2 className="font-display italic font-light text-xl text-navy mb-4">
          Member Intents
        </h2>

        <AdminDataTable
          headers={[
            "Name",
            "Email",
            "Intent",
            "Confidence",
            "City",
            "Source",
            "Date",
          ]}
          rows={intentRows}
          emptyMessage="No classified intents yet"
        />
      </section>

      <div className="border-t border-border my-8" />

      {/* ─── SECTION 3: Regional Interest ─── */}
      <section>
        <h2 className="font-display italic font-light text-xl text-navy mb-4">
          Regional Interest
        </h2>

        <AdminDataTable
          headers={["City", "Interest Count"]}
          rows={regionRows}
          emptyMessage="No regional data yet"
        />
      </section>
    </div>
  );
}
