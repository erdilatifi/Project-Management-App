"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function TasksPanel() {
  // Placeholder; wire to tasks API later
  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-300">
        Your assigned tasks will appear here. Coming soon.
      </div>
      <Button size="sm" variant="outline" className="border-neutral-700" disabled>
        Create task
      </Button>
    </div>
  );
}

