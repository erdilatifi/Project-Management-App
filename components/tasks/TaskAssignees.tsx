"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

type User = {
  id: string;
  label: string;
};

type TaskAssigneesProps = {
  assignees: User[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
};

export function TaskAssignees({ assignees, maxDisplay = 3, size = "md" }: TaskAssigneesProps) {
  if (assignees.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="h-3 w-3" />
        <span className="text-xs">Unassigned</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  const displayed = assignees.slice(0, maxDisplay);
  const remaining = assignees.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {displayed.map((user) => (
          <Avatar
            key={user.id}
            className={`${sizeClasses[size]} ring-2 ring-card transition-transform hover:scale-110 hover:z-10`}
            title={user.label}
          >
            <AvatarFallback className={`${textSizeClasses[size]} font-semibold bg-gradient-to-br from-primary/60 to-primary/40`}>
              {user.label[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {remaining > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] rounded-full">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
