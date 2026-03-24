// @version 0.5.0 - Echo: styled input primitive (shadcn/ui pattern)
import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-sans text-ink placeholder:text-ink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard/30 focus-visible:border-mustard disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
