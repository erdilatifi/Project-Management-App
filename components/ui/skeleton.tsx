"use client";

import * as React from "react";

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={("animate-pulse rounded-md bg-neutral-800/60 " + className).trim()} {...props} />
  );
}

export default Skeleton;
