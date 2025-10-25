"use client";

import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={(
          "flex min-h-[80px] w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm text-white " +
          "placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 " +
          className
        ).trim()}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export default Textarea;

