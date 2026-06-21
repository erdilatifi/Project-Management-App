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
import NotificationPreferences from "@/components/profile/NotificationPreferences";
import NotificationsList from "@/components/notifications/NotificationsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { UserCircle } from "lucide-react";
import { getProfileRoleTitle, PROFILE_ROLE_COLUMN } from "@/lib/profileFields";
import { syncWorkspaceMemberProfile } from "@/lib/memberProfileSync";

// Validation schema for profile form fields
const schema = z.object({
  full_name: z.string().min(1, "Full name is required").max(120),
  job_title: z.string().max(120).optional().or(z.literal("")),
  avatar_file: z.any().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const supabase = createClient();

  // User authentication and profile state
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Avatar removal dialog state
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const emitProfileUpdated = (detail: { full_name?: string | null; username?: string | null; avatar_url?: string | null }) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("profile-updated", { detail }));
  };

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

  // Generate preview URL for selected avatar or show existing avatar
  const previewUrl = useMemo(() => {
    if (avatarFile?.length) return URL.createObjectURL(avatarFile[0]);
    return existingAvatarUrl ?? undefined;
  }, [avatarFile, existingAvatarUrl]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    if (!avatarFile?.length) return;
    const url = URL.createObjectURL(avatarFile[0]);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Load user authentication and profile data on component mount
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
      setUserEmail(data.user?.email ?? null);
      if (!uid) return;

      // Fetch user profile from database
      const { data: profile, error: profErr, status } = await supabase
        .from("profiles")
        .select(`full_name, username, email, ${PROFILE_ROLE_COLUMN}, avatar_url`)
        .eq("id", uid)
        .maybeSingle();

      if (profErr) {
        console.error({ profErr, status });
        const msg = `Failed to load profile: ${profErr.message} (HTTP ${status})`;
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      // Populate form with existing profile data
      if (profile) {
        reset({
          full_name: profile.full_name ?? "",
          job_title: getProfileRoleTitle(profile),
        });
        setExistingAvatarUrl(profile.avatar_url ?? null);
        await syncWorkspaceMemberProfile(supabase as any, uid, {
          ...profile,
          email: profile.email ?? data.user?.email ?? null,
        });
      } else {
        reset({ full_name: "", job_title: "" });
      }
    };

    load();
  }, []);

  // Validate avatar file size and type before upload
  const validateAvatarLocal = () => {
    const f = avatarFile?.[0];
    if (!f) {
      clearErrors("avatar_file");
      return true;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB limit
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

  // Upload avatar image to Supabase storage and return public URL
  async function uploadAvatarIfAny(uid: string): Promise<string | null> {
    if (!avatarFile?.length) return null;
    if (!validateAvatarLocal()) return null;

    setUploading(true);
    try {
      const file = avatarFile[0];
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/${Date.now()}.${ext}`;

      // Upload to Supabase storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("profile-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Get public URL for the uploaded image
      const { data: publicData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      return publicData.publicUrl;
    } finally {
      setUploading(false);
    }
  }

  // Extract storage path from Supabase public URL for file deletion
  // Parses URLs like: https://<ref>.supabase.co/storage/v1/object/public/profile-images/<path>
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

  // Handle avatar removal: delete from storage and update database
  const handleRemoveConfirmed = async () => {
    if (!userId) return;
    if (!existingAvatarUrl) {
      setRemoveOpen(false);
      return;
    }
    setRemoving(true);
    try {
      // Delete file from storage if path can be extracted
      const storagePath = getStoragePathFromPublicUrl(existingAvatarUrl);
      if (storagePath) {
        const { error: delErr } = await supabase
          .storage
          .from("profile-images")
          .remove([storagePath]);
        if (delErr) {
          console.warn("Storage remove warning:", delErr.message);
        }
      }

      // Update database to remove avatar URL
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (upErr) throw upErr;

      setExistingAvatarUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      emitProfileUpdated({ avatar_url: null });
      toast.success( "Your profile image was reset." );
      setRemoveOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error( err?.message ?? "Try again." );
    } finally {
      setRemoving(false);
    }
  };

  // Handle form submission: upload avatar and save profile data
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
      // Upload new avatar if selected
      const newAvatarUrl = await uploadAvatarIfAny(userId);
      const payload = {
        id: userId,
        full_name: values.full_name,
        [PROFILE_ROLE_COLUMN]: values.job_title || null,
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      };

      // Upsert profile data to database
      const { error } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });
      if (error) throw error;

      if (newAvatarUrl) setExistingAvatarUrl(newAvatarUrl);

      await syncWorkspaceMemberProfile(supabase as any, userId, {
        full_name: values.full_name,
        email: userEmail,
        [PROFILE_ROLE_COLUMN]: values.job_title || null,
        avatar_url: (newAvatarUrl ?? existingAvatarUrl) ?? null,
      });

      // Clear file input to allow reselecting the same file
      if (fileInputRef.current) fileInputRef.current.value = "";
      reset({ full_name: values.full_name, job_title: values.job_title || "" });

      emitProfileUpdated({
        full_name: values.full_name,
        avatar_url: (newAvatarUrl ?? existingAvatarUrl) ?? null,
      });
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
        <Card className="glass p-6 max-w-2xl mx-auto space-y-4">
          <CardTitle className="text-2xl font-semibold">Profile</CardTitle>
          <CardContent>You need to sign in to view your profile.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Background Textures */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand-accent/30 opacity-20 blur-[100px]"></div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12 space-y-6">
        <div className="pt-15 max-w-3xl mx-auto flex items-center gap-3">
          <span className="brand-chip h-11 w-11 shrink-0">
            <UserCircle className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your personal details, preferences, and notifications.</p>
          </div>
        </div>

        <Tabs defaultValue="personal" className="space-y-6 max-w-3xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 rounded-xl h-11 p-1">
            <TabsTrigger value="personal" className="rounded-lg">Personal</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg">Preferences</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="glass rounded-2xl border-border shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <CardTitle className="text-lg font-semibold">Personal information</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Update your name, job title, and profile photo.</p>
              </div>

              <CardContent className="px-6 pb-6 space-y-6">
                {errorMsg && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-5 rounded-2xl border border-border bg-muted/30 p-5">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted flex items-center justify-center shadow-sm">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No photo</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <Label htmlFor="avatar_file" className="text-sm font-medium">Profile photo</Label>
                      <Input
                        id="avatar_file"
                        type="file"
                        accept="image/*"
                        className="rounded-xl bg-background border-border"
                        {...register("avatar_file")}
                        ref={(el) => {
                          register("avatar_file").ref(el);
                          fileInputRef.current = el;
                        }}
                        onChange={(e) => {
                          register("avatar_file").onChange(e);
                          const ok = validateAvatarLocal();
                          if (!ok && fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {existingAvatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => setRemoveOpen(true)}
                          >
                            Remove photo
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Square image recommended, max 2MB.
                        </p>
                      </div>
                      {errors.avatar_file && (
                        <p className="text-xs text-destructive">
                          {String(errors.avatar_file.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        placeholder="John Doe"
                        className="rounded-xl bg-background border-border"
                        {...register("full_name")}
                      />
                      {errors.full_name && (
                        <p className="text-xs text-destructive">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job title</Label>
                      <Input
                        id="job_title"
                        placeholder="Project Manager"
                        className="rounded-xl bg-background border-border"
                        {...register("job_title")}
                      />
                      {errors.job_title && (
                        <p className="text-xs text-destructive">
                          {String(errors.job_title.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Button type="submit" disabled={saving || uploading} className="rounded-xl">
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                    {uploading && <span className="text-sm text-muted-foreground">Uploading image…</span>}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="glass rounded-2xl border-border shadow-sm">
              <div className="px-6 pt-6 pb-2">
                <CardTitle className="text-lg font-semibold">Preferences</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Customize notifications and app behavior.</p>
              </div>
              <CardContent className="px-6 pb-6">
                <NotificationPreferences />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="glass rounded-2xl border-border shadow-sm">
              <div className="px-6 pt-6 pb-2">
                <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review recent activity and updates.</p>
              </div>
              <CardContent className="px-6 pb-6">
                <NotificationsList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
    </div>
  );
}


