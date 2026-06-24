import { Avatar } from "@/components/avatar";
import { uploadProfilePicture, removeProfilePicture } from "@/lib/avatar-actions";

type Props = {
  currentUrl?: string | null;
  name: string;
  role: "coach" | "client";
  returnTo: string;
};

export function AvatarUploader({ currentUrl, name, role, returnTo }: Props) {
  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
      <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">
        Profile picture
      </h2>
      <div className="flex items-center gap-5 flex-wrap">
        <Avatar url={currentUrl} name={name} size="xl" />
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-sm text-[var(--color-muted)]">
            Visible to your {role === "coach" ? "clients" : "coach"}. JPG, PNG, WebP, or GIF up to 5MB.
          </p>
          <form action={uploadProfilePicture} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="text-sm text-[var(--color-muted)] file:mr-3 file:btn file:btn-ghost file:text-sm file:cursor-pointer"
            />
            <button type="submit" className="btn btn-primary text-sm">
              Upload
            </button>
          </form>
          {currentUrl ? (
            <form action={removeProfilePicture}>
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] underline">
                Remove picture
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
