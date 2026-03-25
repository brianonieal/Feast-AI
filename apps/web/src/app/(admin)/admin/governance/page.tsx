// @version 2.0.0 - Pantheon: Governance page (founding_table only)
// Proposals list + voting + new proposal form
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Scale, Plus, X } from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/Input";
import { VoiceTextArea } from "@/components/ui/VoiceTextArea";

interface Proposal {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  authorName: string;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  quorum: number;
  totalVotes: number;
  closesAt: string;
  createdAt: string;
  userVote: string | null;
}

const STATUS_BORDER: Record<string, string> = {
  open: "border-l-mustard",
  voting: "border-l-teal",
  passed: "border-l-navy",
  rejected: "border-l-coral",
  withdrawn: "border-l-border",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-mustard-soft text-mustard",
  voting: "bg-teal-soft text-teal",
  passed: "bg-navy/10 text-navy",
  rejected: "bg-coral-soft text-coral",
  withdrawn: "bg-[var(--bg-surface)] text-ink-light",
};

const CATEGORY_BADGE: Record<string, string> = {
  general: "bg-[var(--bg-surface)] text-ink-mid",
  policy: "bg-navy/10 text-navy",
  financial: "bg-mustard-soft text-mustard",
  membership: "bg-teal-soft text-teal",
};

export default function GovernancePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [closesAt, setClosesAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user?.tier !== "founding_table") {
      router.replace("/admin/events");
    }
  }, [isLoading, user, router]);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch("/api/governance/proposals");
      const data = (await res.json()) as { data?: Proposal[] };
      setProposals(data.data ?? []);
    } catch {
      // silent
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.tier === "founding_table") fetchProposals();
  }, [user, fetchProposals]);

  const handleSubmitProposal = async () => {
    if (!title || !body || !closesAt) return;
    setSubmitting(true);
    try {
      await fetch("/api/governance/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, closesAt }),
      });
      setTitle("");
      setBody("");
      setCategory("general");
      setClosesAt("");
      setShowForm(false);
      fetchProposals();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: string, vote: string) => {
    try {
      await fetch(`/api/governance/proposals/${proposalId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      // Optimistic: update local state
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                userVote: vote,
                votesFor: vote === "for" ? p.votesFor + 1 : p.votesFor,
                votesAgainst:
                  vote === "against" ? p.votesAgainst + 1 : p.votesAgainst,
                abstentions:
                  vote === "abstain" ? p.abstentions + 1 : p.abstentions,
                totalVotes: p.totalVotes + 1,
              }
            : p
        )
      );
    } catch {
      // silent
    }
  };

  if (isLoading || dataLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
            Governance
          </h1>
          <span className="inline-block mt-1 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium">
            Founding Table
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 bg-mustard text-white rounded-full px-4 py-2 text-xs font-medium hover:bg-mustard/90 transition-colors"
        >
          {showForm ? (
            <>
              <X size={12} /> Cancel
            </>
          ) : (
            <>
              <Plus size={12} /> New Proposal
            </>
          )}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
              Title
            </label>
            <Input
              placeholder="Proposal title (min 5 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <VoiceTextArea
            label="Description"
            placeholder="Describe your proposal in detail (min 20 characters)"
            value={body}
            onChange={setBody}
            rows={5}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-sans text-ink"
              >
                <option value="general">General</option>
                <option value="policy">Policy</option>
                <option value="financial">Financial</option>
                <option value="membership">Membership</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
                Voting closes
              </label>
              <input
                type="date"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-sans text-ink"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmitProposal}
            disabled={submitting || !title || !body || !closesAt}
            className="bg-mustard text-white rounded-full px-5 py-2 text-xs font-medium hover:bg-mustard/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Proposal"}
          </button>
        </div>
      )}

      {/* Proposals list */}
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <Scale size={24} className="text-ink-light mx-auto mb-3" />
          <p className="font-display italic text-ink-light">
            No proposals yet
          </p>
          <p className="font-sans text-xs text-ink-light mt-1">
            Start the conversation by creating one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const quorumPct = Math.min(
              100,
              Math.round((p.totalVotes / p.quorum) * 100)
            );
            const isOpen =
              ["open", "voting"].includes(p.status) &&
              new Date(p.closesAt) > new Date();

            return (
              <div
                key={p.id}
                className={`bg-card border border-border rounded-lg p-4 border-l-[3px] ${STATUS_BORDER[p.status] ?? "border-l-border"}`}
              >
                {/* Top row: title + badges */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display italic font-light text-[15px] text-navy leading-tight flex-1">
                    {p.title}
                  </h3>
                  <div className="flex gap-1.5 ml-2 flex-shrink-0">
                    <span
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${CATEGORY_BADGE[p.category] ?? CATEGORY_BADGE.general}`}
                    >
                      {p.category}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] ?? STATUS_BADGE.open}`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>

                {/* Author + date */}
                <p className="font-sans text-xs text-ink-light mb-3">
                  by {p.authorName} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>

                {/* Vote counts */}
                <p className="font-sans text-xs text-ink-mid mb-2">
                  {p.votesFor} for · {p.votesAgainst} against ·{" "}
                  {p.abstentions} abstain
                </p>

                {/* Quorum bar */}
                <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-teal rounded-full transition-all"
                    style={{ width: `${quorumPct}%` }}
                  />
                </div>
                <p className="font-sans text-[10px] text-ink-light mb-3">
                  {p.totalVotes} / {p.quorum} votes (quorum{" "}
                  {quorumPct >= 100 ? "reached" : `${quorumPct}%`})
                </p>

                {/* Vote buttons or voted status */}
                {p.userVote ? (
                  <span className="inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-soft text-teal font-medium">
                    Voted: {p.userVote}
                  </span>
                ) : isOpen ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleVote(p.id, "for")}
                      className="text-xs font-medium text-teal border border-teal rounded-full px-3 py-1 hover:bg-teal-soft transition-colors"
                    >
                      For
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote(p.id, "against")}
                      className="text-xs font-medium text-coral border border-coral rounded-full px-3 py-1 hover:bg-coral-soft transition-colors"
                    >
                      Against
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote(p.id, "abstain")}
                      className="text-xs font-medium text-ink-light border border-border rounded-full px-3 py-1 hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      Abstain
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
