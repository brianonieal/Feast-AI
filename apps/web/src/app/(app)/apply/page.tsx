// @version 0.5.0 - Echo: Application page — "How will you Feast?"
// Matches mockup Row 2 Col 1 — single-page form
import { ApplicationForm } from "@/components/apply/ApplicationForm";

export default function ApplyPage() {
  return (
    <div className="py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Join the family
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          How will you Feast?
        </h1>
        <p className="font-sans text-[13px] text-ink-mid mt-1">
          There&apos;s a place for you at our table.
        </p>
      </div>

      <ApplicationForm />
    </div>
  );
}
