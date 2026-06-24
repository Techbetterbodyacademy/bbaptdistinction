"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type PointerEvent as RPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { saveProfilePictureClient, removeProfilePictureClient } from "@/lib/avatar-actions";

type Props = {
  currentUrl?: string | null;
  name: string;
  role: "coach" | "client";
  returnTo: string;
};

const CONTAINER = 320;
const OUTPUT = 512;

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

export function AvatarUploader({ currentUrl, name, role, returnTo }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgPos, setImgPos] = useState<Pos>({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<Size>({ w: CONTAINER, h: CONTAINER });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const cancelCrop = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setImgPos({ x: 0, y: 0 });
    setImgSize({ w: CONTAINER, h: CONTAINER });
  }, [previewUrl]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setImgPos({ x: 0, y: 0 });
    // Reset the input so the same file can be picked again later
    e.target.value = "";
  }

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const scale = Math.max(CONTAINER / img.naturalWidth, CONTAINER / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    setImgSize({ w, h });
    setImgPos({ x: (CONTAINER - w) / 2, y: (CONTAINER - h) / 2 });
  }

  function clampPos(newX: number, newY: number, size: Size): Pos {
    return {
      x: Math.min(0, Math.max(CONTAINER - size.w, newX)),
      y: Math.min(0, Math.max(CONTAINER - size.h, newY))
    };
  }

  function onPointerDown(e: RPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: imgPos.x,
      startPosY: imgPos.y
    };
  }
  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setImgPos(clampPos(dragRef.current.startPosX + dx, dragRef.current.startPosY + dy, imgSize));
  }
  function onPointerUp(e: RPointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  async function applyCropAndUpload() {
    if (!file || !imgRef.current) return;
    setError(null);
    setUploading(true);

    try {
      const img = imgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Canvas not supported");
        setUploading(false);
        return;
      }

      const naturalScale = img.naturalWidth / imgSize.w;
      const sx = -imgPos.x * naturalScale;
      const sy = -imgPos.y * naturalScale;
      const sSize = CONTAINER * naturalScale;

      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );
      if (!blob) {
        setError("Could not process the image");
        setUploading(false);
        return;
      }

      // Show the cropped result optimistically right away
      const optimistic = URL.createObjectURL(blob);
      setOptimisticUrl(optimistic);

      const fd = new FormData();
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      fd.append("avatar", croppedFile);

      const result = await saveProfilePictureClient(fd);

      if (!result.ok) {
        setError(result.error || "Upload failed");
        setOptimisticUrl(null);
        setUploading(false);
        return;
      }

      // Swap from blob URL to the real cache-busted public URL
      setOptimisticUrl(result.url);
      setUploading(false);
      cancelCrop();
      router.refresh();
    } catch (err) {
      console.error("[avatar-uploader] upload failed", err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      setOptimisticUrl(null);
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setError(null);
    setUploading(true);
    setOptimisticUrl(null);
    try {
      const result = await removeProfilePictureClient();
      if (!result.ok) {
        setError(result.error || "Remove failed");
        setUploading(false);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("[avatar-uploader] remove failed", err);
      const msg = err instanceof Error ? err.message : "Remove failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = optimisticUrl ?? currentUrl ?? null;
  const inCropMode = file !== null && previewUrl !== null;

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
      <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">
        Profile picture
      </h2>

      {error ? (
        <div className="mb-4 bg-[rgba(148,163,184,0.1)] border border-[rgba(148,163,184,0.3)] rounded-xl p-3 text-sm text-[var(--color-warn)]">
          {error}
        </div>
      ) : null}

      {inCropMode ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Drag the image to choose what fits inside the circle.
          </p>

          <div
            className="relative mx-auto bg-[var(--color-bg-deep)] rounded-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: CONTAINER, height: CONTAINER }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={previewUrl!}
              alt="Crop preview"
              onLoad={onImgLoad}
              draggable={false}
              className="absolute select-none"
              style={{
                left: imgPos.x,
                top: imgPos.y,
                width: imgSize.w,
                height: imgSize.h,
                maxWidth: "none",
                pointerEvents: "none"
              }}
            />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={cancelCrop}
              disabled={uploading}
              className="btn btn-ghost text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCropAndUpload}
              disabled={uploading}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {uploading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-5 flex-wrap">
          <Avatar url={displayUrl} name={name} size="xl" />
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm text-[var(--color-muted)]">
              Visible to your {role === "coach" ? "clients" : "coach"}. JPG, PNG, WebP, or GIF up to 5MB.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn btn-ghost text-sm cursor-pointer">
                {currentUrl ? "Replace picture" : "Upload picture"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
              {currentUrl ? (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] underline disabled:opacity-50"
                >
                  Remove picture
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
