// @version 0.5.0 - Echo: shared loading spinner
// Reusable across all role-guarded pages
"use client";

import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-ink-light" />
    </div>
  );
}
