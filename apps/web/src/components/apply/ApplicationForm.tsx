// @version 0.5.0 - Echo: Application form for host/facilitator role
// @version 0.7.0 - Compass: wired to POST /api/applications
// @version 2.0.0 - Pantheon: voice-assisted textarea on motivation fields
// Matches mockup Row 2 Col 1 — single-page form, no multi-step wizard
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { VoiceTextArea } from "@/components/ui/VoiceTextArea";

type RoleOption = "host" | "facilitator";

const ROLES: {
  value: RoleOption;
  title: string;
  description: string;
}[] = [
  {
    value: "host",
    title: "Official Host",
    description:
      "Open your home, expand your world. You\u2019ll create transformative experiences in your own space, bringing together your community for evenings of profound conversation and connection.",
  },
  {
    value: "facilitator",
    title: "Official Facilitator",
    description:
      "Guide conversations that matter. Help create the conditions for authentic sharing, hold space for vulnerability, and guide groups through conversations that touch on purpose and fulfillment.",
  },
];

export function ApplicationForm() {
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [draws, setDraws] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRole || !name || !city) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          name,
          city,
          isOrganizer: organizer || undefined,
          motivation: draws || undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        code?: string;
      };

      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 409) {
        setError("You already have a pending application for this role.");
      } else {
        setError("Something went wrong. Please try again.");
        console.error("Application error:", data);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── PART A: Role Selection ─── */}
      <div className="space-y-3">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelectedRole(role.value)}
              className={`w-full text-left bg-card rounded-lg p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                isSelected
                  ? "border-2 border-mustard"
                  : "border border-border"
              }`}
            >
              {/* Radio dot */}
              <div
                className={`w-[14px] h-[14px] rounded-full flex-shrink-0 mt-1 flex items-center justify-center ${
                  isSelected
                    ? "bg-mustard-soft border-2 border-mustard"
                    : "bg-[var(--bg-surface)] border-2 border-border"
                }`}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-mustard" />
                )}
              </div>

              {/* Role text */}
              <div className="min-w-0">
                <h3 className="font-display italic font-light text-base text-navy leading-tight">
                  {role.title}
                </h3>
                <p className="font-sans text-xs text-ink-mid mt-1 leading-relaxed">
                  {role.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── PART B: Form Fields ─── */}
      <div className="space-y-4">
        <div>
          <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
            Name
          </label>
          <Input
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
            City
          </label>
          <Input
            placeholder="Your city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <VoiceTextArea
          label="Are you a community organizer?"
          rows={3}
          placeholder="Tell us about your community experience..."
          value={organizer}
          onChange={setOrganizer}
        />

        <VoiceTextArea
          label="What draws you to this role?"
          rows={4}
          placeholder="What draws you to hosting or facilitating?"
          value={draws}
          onChange={setDraws}
        />
      </div>

      {/* ─── PART C: Submit ─── */}
      {error && (
        <p className="text-coral text-sm text-center mb-2">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || submitted || !selectedRole || !name || !city}
        className="w-full bg-mustard text-white rounded-full py-3 font-sans font-medium hover:bg-mustard/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </button>

      {submitted && (
        <p className="font-sans text-sm text-teal text-center mt-2">
          Application received. We&apos;ll be in touch soon.
        </p>
      )}
    </div>
  );
}
