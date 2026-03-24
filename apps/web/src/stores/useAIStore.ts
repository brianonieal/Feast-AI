// @version 0.5.0 - Echo: AI Council job state management
"use client";

import { create } from "zustand";
import type {
  CouncilJob,
  CouncilJobType,
  CouncilOutputType,
} from "@feast-ai/shared/types/ai";

interface AIState {
  jobs: Record<string, CouncilJob>;
  activeJobId: string | null;
  startJob: (type: CouncilJobType, eventId?: string, triggeredBy?: string) => string;
  updateJob: (id: string, patch: Partial<CouncilJob>) => void;
  setActiveOutputTab: (jobId: string, tab: CouncilOutputType) => void;
  clearJob: (id: string) => void;
  getActiveJob: () => CouncilJob | null;
}

export const useAIStore = create<AIState>()((set, get) => ({
  jobs: {},
  activeJobId: null,

  startJob: (type, eventId, triggeredBy = "") => {
    const id = `${type}-${Date.now()}`;
    const job: CouncilJob = {
      id,
      type,
      status: "queued",
      triggeredBy,
      eventId,
      inputPayload: {},
      activeOutputTab: "article",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ jobs: { ...s.jobs, [id]: job }, activeJobId: id }));
    return id;
  },

  updateJob: (id, patch) =>
    set((s) => {
      const existing = s.jobs[id];
      if (!existing) return s;
      return {
        jobs: { ...s.jobs, [id]: { ...existing, ...patch, updatedAt: new Date() } },
      };
    }),

  setActiveOutputTab: (jobId, tab) =>
    set((s) => {
      const existing = s.jobs[jobId];
      if (!existing) return s;
      return {
        jobs: { ...s.jobs, [jobId]: { ...existing, activeOutputTab: tab } },
      };
    }),

  clearJob: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.jobs;
      return {
        jobs: rest,
        activeJobId: s.activeJobId === id ? null : s.activeJobId,
      };
    }),

  getActiveJob: () => {
    const { jobs, activeJobId } = get();
    return activeJobId ? (jobs[activeJobId] ?? null) : null;
  },
}));
