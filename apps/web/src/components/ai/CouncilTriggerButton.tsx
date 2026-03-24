// @version 0.5.0 - Echo: Council AI trigger button
// Role-guarded: only renders if can('canTriggerAICouncil')
// Three visual states: idle → loading → awaiting_review
// Stub POST — console.log only, demo timeout simulates AI response
"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { CouncilJobType } from "@feast-ai/shared";
import { useUserStore } from "@/stores/useUserStore";
import { useAIStore } from "@/stores/useAIStore";
import { ContentReviewEditor } from "./ContentReviewEditor";

// Demo content — clearly labeled as seed data for the review editor
const DEMO_ARTICLE =
  "Last Thursday\u2019s Brooklyn Harvest Dinner brought together 12 strangers around a single question: what does it mean to truly arrive? What unfolded over three hours was something rare \u2014 the kind of conversation that changes how you move through the world. Guests arrived as strangers and left as something closer to kin.";

const DEMO_SOCIAL =
  "What does it mean to truly arrive? 12 strangers found out at last week\u2019s Brooklyn Harvest Dinner \u2014 and the answer surprised everyone in the room. More dinners coming to your city.";

const DEMO_RECAP =
  "Brooklyn Harvest Dinner \u00b7 Jun 18\n12 guests \u00b7 Host: Maya R. Theme: Arrival\nSentiment: 94% positive\n3 guests expressed interest in hosting their own Feast.";

const DEMO_INSTAGRAM =
  "\u201cI haven\u2019t felt that connected to strangers in years.\u201d\n\nThat\u2019s what one guest said after Thursday\u2019s dinner. We asked one question. Twelve people showed up fully. This is what The Feast is for.";

interface CouncilTriggerButtonProps {
  type: CouncilJobType;
  eventId: string;
  label: string;
  onJobStarted?: (jobId: string) => void;
}

export function CouncilTriggerButton({
  type,
  eventId,
  label,
  onJobStarted,
}: CouncilTriggerButtonProps) {
  const can = useUserStore((s) => s.can);
  const user = useUserStore((s) => s.user);
  const startJob = useAIStore((s) => s.startJob);
  const updateJob = useAIStore((s) => s.updateJob);
  const jobs = useAIStore((s) => s.jobs);
  const activeJobId = useAIStore((s) => s.activeJobId);

  const [showEditor, setShowEditor] = useState(false);

  // Role guard — return null if user cannot trigger AI
  if (!can("canTriggerAICouncil")) return null;

  const activeJob = activeJobId ? jobs[activeJobId] : null;
  const isLoading =
    activeJob?.status === "queued" || activeJob?.status === "running";
  const isAwaitingReview = activeJob?.status === "awaiting_review";

  const handleTrigger = () => {
    if (isLoading || isAwaitingReview) return;

    const jobId = startJob(type, eventId, user?.id ?? "");

    // Stub POST — console.log only this sprint
    console.log("[CouncilTriggerButton] POST /api/council/jobs:", {
      type,
      eventId,
      jobId,
    });

    onJobStarted?.(jobId);

    // Demo: simulate AI completing after 2s
    setTimeout(() => {
      updateJob(jobId, {
        status: "awaiting_review",
        output: {
          article: DEMO_ARTICLE,
          social: DEMO_SOCIAL,
          recap: DEMO_RECAP,
          instagram: DEMO_INSTAGRAM,
        },
      });
    }, 2000);
  };

  const handleReviewClick = () => {
    setShowEditor(true);
  };

  // State: awaiting_review → teal "Review content →" pill
  if (isAwaitingReview) {
    return (
      <>
        <button
          type="button"
          onClick={handleReviewClick}
          className="inline-flex items-center gap-1.5 bg-teal text-white rounded-full px-4 py-2 text-xs font-sans font-medium hover:bg-teal/90 transition-colors"
        >
          Review content &rarr;
        </button>

        {showEditor && activeJob && (
          <ContentReviewEditor
            job={activeJob}
            onClose={() => setShowEditor(false)}
          />
        )}
      </>
    );
  }

  // State: loading/queued → disabled spinner
  if (isLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 bg-mustard-soft border border-mustard/30 text-mustard rounded-full px-4 py-2 text-xs font-sans font-medium cursor-not-allowed opacity-60"
      >
        <Loader2 size={12} className="animate-spin" />
        The Council is working&hellip;
      </button>
    );
  }

  // State: idle → trigger button
  return (
    <button
      type="button"
      onClick={handleTrigger}
      className="inline-flex items-center gap-1.5 bg-mustard-soft border border-mustard/30 text-mustard rounded-full px-4 py-2 text-xs font-sans font-medium hover:bg-mustard-soft/80 transition-colors"
    >
      <Sparkles size={12} />
      {label}
    </button>
  );
}
