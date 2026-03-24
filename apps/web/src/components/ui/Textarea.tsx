// @version 0.5.0 - Echo: styled textarea primitive (shadcn/ui pattern)
import * as React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-sans text-ink placeholder:text-ink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard/30 focus-visible:border-mustard disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
