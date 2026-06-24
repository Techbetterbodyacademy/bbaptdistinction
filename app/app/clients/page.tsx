import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type StatusFilter = "all" | "active" | "paused" | "completed" | "pending";

export default async function ClientsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; invited?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (params.status as StatusFilter | undefined) ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  let clientsQuery = supabase
    .from("client_profile")
    .select("id, user_id, status, current_weight_kg, start_weight_kg, created_at, user_profile:user_id(full_name, avatar_url)")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  if (status !== "all" && status !== "pending") {
    clientsQuery = clientsQuery.eq("status", status);
  }

  const [{ data: clients }, { data: invites }] = await Promise.all([
    clientsQuery,
    supabase
      .from("client_invite")
      .select("id, email, full_name, status, created_at")
      .eq("workspace_id", workspace!.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  ]);

  const showInvitedBanner = params.invited === "1";

  const filteredClients = (clients ?? []).filter((c) => {
    if (!query) return true;
    const name = ((c.user_profile as { full_name?: string } | null)?.full_name ?? "").toLowerCase();
    return name.includes(query.toLowerCase());
  });

  const filteredInvites = status === "pending" || status === "all"
    ? (invites ?? []).filter((i) =>
        !query ||
        i.full_name.toLowerCase().includes(query.toLowerCase()) ||
        i.email.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Roster
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Clients</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {filteredClients.length + filteredInvites.length} on file
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/app/clients/import" className="btn btn-ghost text-sm">
            Import CSV
          </Link>
          <Link href="/app/clients/new" className="btn btn-primary">
            Add client
          </Link>
        </div>
      </header>

      {showInvitedBanner ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Invite sent. They&rsquo;ll appear here as soon as they finish intake.
        </div>
      ) : null}

      <form className="flex flex-wrap items-center gap-3 mb-6" action="/app/clients">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name or email"
          className="input max-w-sm"
        />
        <StatusFilterPill current={status} value="all" label="All" />
        <StatusFilterPill current={status} value="active" label="Active" />
        <StatusFilterPill current={status} value="paused" label="Paused" />
        <StatusFilterPill current={status} value="completed" label="Completed" />
        <StatusFilterPill current={status} value="pending" label="Pending intake" />
      </form>

      {filteredClients.length === 0 && filteredInvites.length === 0 ? (
        <EmptyState hasQuery={Boolean(query)} />
      ) : (
        <div className="space-y-2">
          {filteredInvites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
          {filteredClients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      )}
    </main>
  );
}

function StatusFilterPill({
  current,
  value,
  label
}: {
  current: string;
  value: string;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={value === "all" ? "/app/clients" : `/app/clients?status=${value}`}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active
          ? "bg-[var(--color-blue)] text-black"
          : "border border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]"
      }`}
    >
      {label}
    </Link>
  );
}

function ClientRow({
  client
}: {
  client: {
    id: string;
    status: string;
    current_weight_kg: number | null;
    start_weight_kg: number | null;
    created_at: string;
    user_profile: { full_name?: string; avatar_url?: string } | { full_name?: string; avatar_url?: string }[] | null;
  };
}) {
  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Unnamed";
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const weightDelta =
    client.start_weight_kg && client.current_weight_kg
      ? (client.current_weight_kg - client.start_weight_kg).toFixed(1)
      : null;

  return (
    <Link
      href={`/app/clients/${client.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-line)] hover:border-[var(--color-blue)] hover:bg-[rgba(0,174,239,0.04)] transition-colors"
    >
      <div className="shrink-0 w-11 h-11 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-sm flex items-center justify-center">
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{name}</div>
        <div className="text-xs text-[var(--color-muted)] mt-0.5">
          Joined {new Date(client.created_at).toLocaleDateString()}
        </div>
      </div>
      <div className="text-xs text-[var(--color-muted)] hidden md:block">
        {weightDelta ? `${weightDelta} kg` : "No weight data"}
      </div>
      <StatusBadge status={client.status} />
    </Link>
  );
}

function InviteRow({
  invite
}: {
  invite: { id: string; email: string; full_name: string; created_at: string };
}) {
  const initials = invite.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Link
      href={`/app/clients/invite/${invite.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[rgba(148,163,184,0.04)] hover:border-[var(--color-warn)] transition-colors"
    >
      <div className="shrink-0 w-11 h-11 rounded-full bg-[rgba(148,163,184,0.15)] text-[var(--color-warn)] font-extrabold text-sm flex items-center justify-center">
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{invite.full_name}</div>
        <div className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{invite.email}</div>
      </div>
      <div className="text-xs text-[var(--color-muted)] hidden md:block">
        Invited {new Date(invite.created_at).toLocaleDateString()}
      </div>
      <span className="text-[11px] uppercase tracking-[1.5px] font-bold px-2.5 py-1 rounded-full bg-[rgba(148,163,184,0.15)] text-[var(--color-warn)]">
        Get link
      </span>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(34,197,94,0.15)", text: "var(--color-ok)" },
    paused: { bg: "rgba(148,163,184,0.15)", text: "var(--color-warn)" },
    completed: { bg: "rgba(0,174,239,0.15)", text: "var(--color-blue-glow)" }
  };
  const c = colors[status] ?? { bg: "rgba(255,255,255,0.06)", text: "var(--color-muted)" };
  return (
    <span
      className="text-[11px] uppercase tracking-[1.5px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
        <h2 className="text-lg font-bold mb-1">No matches</h2>
        <p className="text-[var(--color-muted)] text-sm">Try a different search.</p>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
      <h2 className="text-lg font-bold mb-1">No clients yet</h2>
      <p className="text-[var(--color-muted)] text-sm mb-6">
        Add your first client to send them an intake form.
      </p>
      <Link href="/app/clients/new" className="btn btn-primary">
        Add your first client
      </Link>
    </div>
  );
}
