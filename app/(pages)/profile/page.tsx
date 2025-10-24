"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required").max(120),
  job_title: z.string().max(120).optional().or(z.literal("")),
  avatar_file: z.any().optional(), 
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // remove dialog state
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", job_title: "" },
  });

  const avatarFile = watch("avatar_file") as FileList | undefined;

  // Show a preview if a new file is selected; else show existing avatar
  const previewUrl = useMemo(() => {
    if (avatarFile?.length) return URL.createObjectURL(avatarFile[0]);
    return existingAvatarUrl ?? undefined;
  }, [avatarFile, existingAvatarUrl]);

  // Revoke preview URL when file changes / component unmounts
  useEffect(() => {
    if (!avatarFile?.length) return;
    const url = URL.createObjectURL(avatarFile[0]);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      setAuthChecked(true);
      if (error) {
        console.error(error);
        const msg = `Auth error: ${error.message}`;
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: profile, error: profErr, status } = await supabase
        .from("profiles")
        .select("full_name, job_title, avatar_url")
        .eq("id", uid)
        .maybeSingle();

      if (profErr) {
        console.error({ profErr, status });
        const msg = `Failed to load profile: ${profErr.message} (HTTP ${status})`;
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      if (profile) {
        reset({
          full_name: profile.full_name ?? "",
          job_title: profile.job_title ?? "",
        });
        setExistingAvatarUrl(profile.avatar_url ?? null);
      } else {
        reset({ full_name: "", job_title: "" });
      }
    };

    load();
  }, []);

  const validateAvatarLocal = () => {
    const f = avatarFile?.[0];
    if (!f) {
      clearErrors("avatar_file");
      return true;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    const isImage = f.type.startsWith("image/");
    if (!isImage) {
      setError("avatar_file", { type: "manual", message: "Please select an image file." });
      return false;
    }
    if (f.size > maxBytes) {
      setError("avatar_file", { type: "manual", message: "Image must be ≤ 2MB." });
      return false;
    }

    clearErrors("avatar_file");
    return true;
  };

  async function uploadAvatarIfAny(uid: string): Promise<string | null> {
    if (!avatarFile?.length) return null;
    if (!validateAvatarLocal()) return null;

    setUploading(true);
    try {
      const file = avatarFile[0];
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("profile-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Public URL (bucket must be public; for private, use signed URLs)
      const { data: publicData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      return publicData.publicUrl;
    } finally {
      setUploading(false);
    }
  }

  // Robust path extraction: returns the storage path WITHOUT the bucket name
  // Works for URLs like:
  // https://<ref>.supabase.co/storage/v1/object/public/profile-images/<path>
  function getStoragePathFromPublicUrl(urlStr: string): string | null {
    try {
      const u = new URL(urlStr);
      const parts = u.pathname.split("/").filter(Boolean);
      // Find "object" and "public" and the bucket name after it
      const objIdx = parts.findIndex((p) => p === "object");
      if (objIdx === -1) return null;
      const publicIdx = objIdx + 1;
      const bucketIdx = objIdx + 2;
      if (parts[publicIdx] !== "public") return null;
      const bucket = parts[bucketIdx]; // should be 'profile-images'
      if (!bucket) return null;
      // Everything after bucket is the internal path
      const path = parts.slice(bucketIdx + 1).join("/");
      return path || null;
    } catch {
      return null;
    }
  }

  const handleRemoveConfirmed = async () => {
    if (!userId) return;
    if (!existingAvatarUrl) {
      setRemoveOpen(false);
      return;
    }
    setRemoving(true);
    try {
      // 1) delete file if we can compute its path
      const storagePath = getStoragePathFromPublicUrl(existingAvatarUrl);
      if (storagePath) {
        const { error: delErr } = await supabase
          .storage
          .from("profile-images")
          .remove([storagePath]);
        if (delErr) {
          // Not fatal; continue to null the DB value
          console.warn("Storage remove warning:", delErr.message);
        }
      }

      // 2) null avatar in DB
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (upErr) throw upErr;

      setExistingAvatarUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success( "Your profile image was reset." );
      setRemoveOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error( err?.message ?? "Try again." );
    } finally {
      setRemoving(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    if (!userId) {
      const msg = "You must be signed in to update your profile.";
      setErrorMsg(msg);
      toast.error( msg );
      return;
    }
    setSaving(true);
    try {
      const newAvatarUrl = await uploadAvatarIfAny(userId);
      const payload = {
        id: userId,
        full_name: values.full_name,
        job_title: values.job_title || null,
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      };

      const { error } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });
      if (error) throw error;

      if (newAvatarUrl) setExistingAvatarUrl(newAvatarUrl);

      // Clear file input after successful save (so same filename can be reselected)
      if (fileInputRef.current) fileInputRef.current.value = "";
      reset({ full_name: values.full_name, job_title: values.job_title || "" });

      toast.success( "Your changes have been saved." );
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Failed to save profile.";
      setErrorMsg(msg);
      toast.error( msg );
    } finally {
      setSaving(false);
    }
  };

  if (authChecked && !userId) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Card className="p-6 lg:min-w-[700px] space-y-4">
          <CardTitle className="text-2xl font-semibold">Profile</CardTitle>
          <CardContent>You need to sign in to view your profile.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <Card className="p-6 lg:min-w-[700px] space-y-6">
        <CardTitle className="text-2xl font-semibold">Profile</CardTitle>

        <CardContent className="space-y-6">
          {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No avatar</span>
                )}
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium">Avatar</label>
                <Input
                  type="file"
                  accept="image/*"
                  {...register("avatar_file")}
                  ref={(el) => {
                    register("avatar_file").ref(el);
                    fileInputRef.current = el;
                  }}
                  onChange={(e) => {
                    register("avatar_file").onChange(e);
                    // validate on select
                    const ok = validateAvatarLocal();
                    if (!ok) {
                      // if invalid, clear the input so the preview doesn't show
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }
                  }}
                />
                <div className="mt-2 flex items-center gap-2">
                  {existingAvatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-neutral-700"
                      onClick={() => setRemoveOpen(true)}
                    >
                      Remove avatar
                    </Button>
                  )}
                  <p className="ml-auto text-xs text-muted-foreground">
                    Recommended: square image, &lt; 2MB.
                  </p>
                </div>
                {errors.avatar_file && (
                  <p className="mt-1 text-xs text-red-500">
                    {String(errors.avatar_file.message)}
                  </p>
                )}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input placeholder="John Doe" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Job title</label>
              <Input placeholder="Project Manager" {...register("job_title")} />
              {errors.job_title && (
                <p className="text-xs text-red-500">
                  {String(errors.job_title.message)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {uploading && <span className="text-sm">Uploading image…</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirm Remove Avatar Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove avatar?</DialogTitle>
            <DialogDescription>
              This will delete your current profile image and revert to the default avatar.
              You can upload a new image anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 ">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveConfirmed}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
