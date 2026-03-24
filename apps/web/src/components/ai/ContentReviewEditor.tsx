// @version 0.5.0 - Echo: Content review WYSIWYG editor
// Matches mockup Row 2 Col 4 — bottom sheet overlay
// contentEditable div with formatting toolbar
// Tabs: Article / Social / Recap / Instagram
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CouncilJob, CouncilOutputType } from "@feast-ai/shared";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  Heading2,
  Undo2,
} from "lucide-react";

const OUTPUT_TABS: { key: CouncilOutputType; label: string }[] = [
  { key: "article", label: "Article" },
  { key: "social", label: "Social" },
  { key: "recap", label: "Recap" },
  { key: "instagram", label: "Instagram" },
];

interface ContentReviewEditorProps {
  job: CouncilJob;
  onClose: () => void;
}

export function ContentReviewEditor({
  job,
  onClose,
}: ContentReviewEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<CouncilOutputType>("article");

  // Local edits store — preserves changes across tab switches
  const [edits, setEdits] = useState<Record<CouncilOutputType, string>>(() => ({
    article: job.output?.article ?? "",
    social: job.output?.social ?? "",
    recap: job.output?.recap ?? "",
    instagram: job.output?.instagram ?? "",
  }));

  // Populate editor when edits or tab change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = edits[activeTab];
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save current editor content before switching tabs
  const saveCurrentContent = useCallback(() => {
    if (editorRef.current) {
      setEdits((prev) => ({
        ...prev,
        [activeTab]: editorRef.current?.innerHTML ?? prev[activeTab],
      }));
    }
  }, [activeTab]);

  const handleTabSwitch = (tab: CouncilOutputType) => {
    saveCurrentContent();
    setActiveTab(tab);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleReject = () => {
    console.log("[ContentReviewEditor] reject:", job.id);
    onClose();
  };

  const handlePublish = () => {
    saveCurrentContent();
    console.log("[ContentReviewEditor] publish:", job.id, edits);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        role="presentation"
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-page)] rounded-t-2xl max-h-[85vh] overflow-y-auto z-50">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />

        <div className="px-4 pb-6">
          {/* Header */}
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
            Content Review
          </p>
          <h2 className="font-display italic font-light text-xl text-navy leading-tight mb-4">
            Brooklyn Harvest &middot; Jun 18
          </h2>

          {/* Tab row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {OUTPUT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabSwitch(tab.key)}
                className={`rounded-xl px-3 py-1 text-xs font-sans font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-mustard text-white"
                    : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-mustard/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formatting toolbar */}
          <div className="bg-card border border-border rounded-t-md px-2 py-1.5 flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => execCommand("bold")}
              active
              label="B"
            >
              <Bold size={13} />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand("italic")} label="I">
              <Italic size={13} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("underline")}
              label="U"
            >
              <Underline size={13} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => execCommand("insertUnorderedList")}
              label="Bullets"
            >
              <List size={13} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("insertOrderedList")}
              label="Numbers"
            >
              <ListOrdered size={13} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => execCommand("justifyLeft")}
              label="Align"
            >
              <AlignLeft size={13} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("formatBlock", "h2")}
              label="Heading"
            >
              <Heading2 size={13} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton onClick={() => execCommand("undo")} label="Undo">
              <Undo2 size={13} />
            </ToolbarButton>
          </div>

          {/* Editor area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="bg-white border border-border border-t-0 rounded-b-md min-h-[140px] p-4 text-sm font-sans text-ink leading-relaxed outline-none"
          />

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            {/* Left — status */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal inline-block" />
              <span className="font-sans text-xs text-ink-light">
                AI-generated &middot; awaiting review
              </span>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReject}
                className="font-sans text-xs font-medium text-coral border border-coral rounded-full px-3 py-1 hover:bg-coral/5 transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="font-sans text-xs font-medium text-white bg-mustard rounded-full px-3 py-1 hover:bg-mustard/90 transition-colors"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Toolbar sub-components ───

function ToolbarButton({
  onClick,
  active = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-7 h-7 rounded-sm flex items-center justify-center transition-colors ${
        active
          ? "bg-navy text-white"
          : "text-ink-mid hover:bg-[var(--bg-surface)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-1" />;
}
