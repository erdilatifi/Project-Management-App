"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="border-neutral-700">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default function StatsSummary(props: {
  projects?: number;
  tasksTotal?: number;
  tasksCompleted?: number;
  tasksOverdue?: number;
}) {
  const { projects = 0, tasksTotal = 0, tasksCompleted = 0, tasksOverdue = 0 } = props;
  const inProgress = Math.max(tasksTotal - tasksCompleted, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Projects" value={projects} />
        <StatCard label="Tasks (Done)" value={tasksCompleted} hint={`${inProgress} in progress`} />
        <StatCard label="Tasks (Total)" value={tasksTotal} />
        <StatCard label="Overdue" value={tasksOverdue} />
      </div>
    </div>
  );
}

