"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ListChecks, Save, Loader2 } from "lucide-react";

// ---- Types ----

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

// ---- Component ----

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Derived state: unsaved changes
  const dirty = (() => {
    if (!project) return false;
    const n = name.trim();
    const d = description.trim();
    return n !== (project.name ?? "") || (d || "") !== (project.description ?? "");
  })();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error, status } = await supabase
          .from("projects")
          .select("id, name, description, created_at")
          .eq("id", id)
          .maybeSingle<Project>();
        if (error) throw new Error(error.message);
        if (!data) {
          toast.error(`Project not found (HTTP ${status})`);
          router.push("/projects");
          return;
        }
        setProject(data);
        setName(data.name);
        setDescription(data.description ?? "");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [supabase, id, router]);

  // Save handler
  const onSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", id)
        .select("id, name, description, created_at")
        .single<Project>();
      if (error) throw error;
      toast.success("Project updated");
      setProject(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && dirty) onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving]);

  const createdAtText = (ts?: string) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] w-full bg-[radial-gradient(90rem_50rem_at_50%_-10%,rgba(0,0,0,0.05),transparent)]">
      <div className="mx-auto max-w-[1000px] px-6 lg:px-10 py-10">
        {/* Breadcrumbs / Back */}
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to projects
          </Link>
          <span className="select-none text-neutral-400">/</span>
          <span className="truncate text-neutral-600">{project?.name ?? "Project"}</span>
        </div>

        {/* Loading State */}
        {loading || !project ? (
          <Card className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
            <Skeleton className="h-8 w-1/2 rounded" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
            <Separator className="my-6 bg-neutral-200" />
            <div className="grid grid-cols-1 gap-6">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <div className="flex gap-3">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-5 bg-gradient-to-b from-white to-neutral-50/60">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">{project.name}</h1>
                {dirty && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-700 bg-amber-50"
                  >
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/projects/${project.id}/tasks`}>
                  <Button
                    variant="outline"
                    className="rounded-xl border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900"
                  >
                    <ListChecks className="mr-2 h-4 w-4" /> Open Tasks Board
                  </Button>
                </Link>
                <Button
                  onClick={onSave}
                  disabled={saving || !dirty}
                  className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator className="bg-neutral-200" />

            <CardContent className="px-6 py-6">
              <div className="mb-5 text-xs text-neutral-600">
                Created <span className="text-neutral-800">{createdAtText(project.created_at)}</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-neutral-800">
                    Project name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marketing Website Refresh"
                    className="bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:border-neutral-300 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-neutral-800">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="What is this project about? Goals, scope, stakeholders…"
                    className="bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
