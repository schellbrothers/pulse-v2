"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import DataTable from "@/components/DataTable";
import SlideOver, { Section, Row } from "@/components/SlideOver";

// ─── Supabase client (anon — read only) ──────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  zoom_user_id: string | null;
  zoom_phone_number: string | null;
  department: string | null;
  division_id: string | null;
  community_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Division {
  id: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  division_id: string | null;
}

interface Integration {
  id: string;
  user_id: string;
  integration_type: string;
  is_enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  account_id: string | null;
  external_user_id: string | null;
  webhook_url: string | null;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Integration type definitions ─────────────────────────────────────────────

const INTEGRATION_TYPES = [
  { key: "zoom_phone", label: "Zoom Phone", icon: "📞", color: "#3b82f6", note: "Shared Account" },
  { key: "zoom_sms", label: "Zoom SMS", icon: "💬", color: "#22c55e", note: "Shared Account" },
  { key: "zoom_meeting", label: "Zoom Meeting", icon: "🎥", color: "#a855f7", note: "Shared Account" },
  { key: "outlook", label: "Outlook", icon: "📧", color: "#f97316", note: "Per-user OAuth" },
  { key: "rilla", label: "Rilla", icon: "🎙️", color: "#ef4444", note: null },
] as const;

const ROLES = ["OSC", "CSM", "DSM", "Admin"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "success": return "#22c55e";
    case "syncing": return "#eab308";
    case "error": return "#ef4444";
    default: return "#52525b";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "success": return "Connected";
    case "syncing": return "Syncing…";
    case "error": return "Error";
    default: return "Not Connected";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Panel state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [panelTab, setPanelTab] = useState<"profile" | "integrations" | "activity">("profile");

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", email: "", role: "OSC", division_id: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Profile edit form
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Integration edit state
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [integrationForm, setIntegrationForm] = useState<Record<string, string>>({});
  const [integrationSaving, setIntegrationSaving] = useState(false);

  // ─── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [usersRes, divsRes, commsRes, intRes] = await Promise.all([
        supabase.from("users").select("*").order("full_name"),
        supabase.from("divisions").select("id, name").order("name"),
        supabase.from("communities").select("id, name, division_id").order("name"),
        fetch("/api/users/integrations").then((r) => r.json()),
      ]);

      setUsers(usersRes.data ?? []);
      setDivisions(divsRes.data ?? []);
      setCommunities(commsRes.data ?? []);
      setIntegrations(intRes.integrations ?? []);
    } catch (e) {
      console.error("Failed to load team data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── User integrations lookup ─────────────────────────────────────────────────

  function getUserIntegrations(userId: string): Integration[] {
    return integrations.filter((i) => i.user_id === userId);
  }

  function getUserIntegrationMap(userId: string): Map<string, Integration> {
    const map = new Map<string, Integration>();
    for (const i of getUserIntegrations(userId)) {
      map.set(i.integration_type, i);
    }
    return map;
  }

  // ─── Select user → open panel ────────────────────────────────────────────────

  function handleSelectUser(user: User) {
    setSelectedUser(user);
    setPanelTab("profile");
    setProfileForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      division_id: user.division_id,
      community_id: user.community_id,
      zoom_phone_number: user.zoom_phone_number,
      is_active: user.is_active,
    });
    setEditingIntegration(null);
  }

  // ─── Save profile ────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!selectedUser) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, ...profileForm }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, ...result.user } : u)));
      setSelectedUser((prev) => prev ? { ...prev, ...result.user } : prev);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      console.error("Save profile error:", e);
    } finally {
      setProfileSaving(false);
    }
  }

  // ─── Add user ─────────────────────────────────────────────────────────────────

  async function handleAddUser() {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setShowAddModal(false);
      setAddForm({ first_name: "", last_name: "", email: "", role: "OSC", division_id: "" });
      await loadData();
      handleSelectUser(result.user);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setAddSaving(false);
    }
  }

  // ─── Save integration ────────────────────────────────────────────────────────

  async function handleSaveIntegration(intType: string) {
    if (!selectedUser) return;
    setIntegrationSaving(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: selectedUser.id,
        integration_type: intType,
        is_enabled: true,
      };

      // Map form fields to payload
      for (const [key, val] of Object.entries(integrationForm)) {
        if (val !== undefined && val !== "") payload[key] = val;
      }

      const res = await fetch("/api/users/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Refresh integrations
      const intRes = await fetch("/api/users/integrations").then((r) => r.json());
      setIntegrations(intRes.integrations ?? []);
      setEditingIntegration(null);
      setIntegrationForm({});
    } catch (e) {
      console.error("Save integration error:", e);
    } finally {
      setIntegrationSaving(false);
    }
  }

  // ─── Disconnect integration ───────────────────────────────────────────────────

  async function handleDisconnect(intType: string) {
    if (!selectedUser) return;
    try {
      await fetch(`/api/users/integrations?user_id=${selectedUser.id}&integration_type=${intType}`, {
        method: "DELETE",
      });
      const intRes = await fetch("/api/users/integrations").then((r) => r.json());
      setIntegrations(intRes.integrations ?? []);
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  }

  // ─── Toggle integration enabled ──────────────────────────────────────────────

  async function handleToggleIntegration(intType: string, enabled: boolean) {
    if (!selectedUser) return;
    try {
      await fetch("/api/users/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          integration_type: intType,
          is_enabled: enabled,
        }),
      });
      const intRes = await fetch("/api/users/integrations").then((r) => r.json());
      setIntegrations(intRes.integrations ?? []);
    } catch (e) {
      console.error("Toggle error:", e);
    }
  }

  // ─── Division name lookup ─────────────────────────────────────────────────────

  function divisionName(divId: string | null): string {
    if (!divId) return "—";
    return divisions.find((d) => d.id === divId)?.name ?? "—";
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "32px 40px", backgroundColor: "#09090b", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#71717a", fontSize: 14 }}>Loading team…</div>
      </div>
    );
  }

  // ─── Table columns ───────────────────────────────────────────────────────────

  type UserRow = User & { [key: string]: unknown };

  const columns = [
    {
      key: "full_name" as keyof UserRow,
      label: "Name",
      sortable: true,
      width: 180,
      render: (_: unknown, row: UserRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            backgroundColor: row.is_active ? "#80B602" : "#3f3f46",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0,
          }}>
            {(row.first_name?.[0] ?? "").toUpperCase()}{(row.last_name?.[0] ?? "").toUpperCase()}
          </div>
          <span style={{ color: row.is_active ? "#fafafa" : "#52525b" }}>{row.full_name}</span>
        </div>
      ),
    },
    {
      key: "email" as keyof UserRow,
      label: "Email",
      sortable: true,
      width: 220,
    },
    {
      key: "role" as keyof UserRow,
      label: "Role",
      sortable: true,
      filterable: true,
      width: 80,
      render: (v: unknown) => (
        <span style={{
          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
          backgroundColor: v === "Admin" ? "#1e293b" : v === "DSM" ? "#2e1065" : v === "CSM" ? "#14532d" : "#422006",
          color: v === "Admin" ? "#93c5fd" : v === "DSM" ? "#c4b5fd" : v === "CSM" ? "#86efac" : "#fed7aa",
        }}>
          {String(v)}
        </span>
      ),
    },
    {
      key: "division_id" as keyof UserRow,
      label: "Division",
      sortable: true,
      width: 130,
      render: (v: unknown) => <span style={{ color: "#a1a1aa" }}>{divisionName(v as string | null)}</span>,
    },
    {
      key: "zoom_phone_number" as keyof UserRow,
      label: "Phone",
      width: 140,
      render: (v: unknown) => <span style={{ color: "#a1a1aa", fontFamily: "var(--font-mono)", fontSize: 12 }}>{v ? String(v) : "—"}</span>,
    },
    {
      key: "is_active" as keyof UserRow,
      label: "Status",
      sortable: true,
      filterable: true,
      width: 80,
      render: (v: unknown) => (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, color: v ? "#22c55e" : "#ef4444",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: v ? "#22c55e" : "#ef4444" }} />
          {v ? "Active" : "Inactive"}
        </span>
      ),
      filterValues: ["true", "false"],
    },
    {
      key: "_integrations" as keyof UserRow,
      label: "Integrations",
      width: 140,
      render: (_: unknown, row: UserRow) => {
        const userInts = getUserIntegrationMap(row.id);
        return (
          <div style={{ display: "flex", gap: 4 }}>
            {INTEGRATION_TYPES.map((t) => {
              const int = userInts.get(t.key);
              const connected = int && int.is_enabled && int.sync_status === "success";
              return (
                <span
                  key={t.key}
                  title={`${t.label}: ${connected ? "Connected" : "Not connected"}`}
                  style={{
                    width: 20, height: 20, borderRadius: 4, fontSize: 11,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: connected ? `${t.color}22` : "#18181b",
                    border: `1px solid ${connected ? t.color : "#27272a"}`,
                    opacity: connected ? 1 : 0.4,
                  }}
                >
                  {t.icon}
                </span>
              );
            })}
          </div>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 40px", backgroundColor: "#09090b", minHeight: "100vh", overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", margin: 0 }}>Team</h1>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            backgroundColor: "#80B602", color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add User
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#71717a", marginBottom: 24, lineHeight: 1.6 }}>
        Manage team members, roles, and integration connections.
      </p>

      {/* Users Table */}
      <DataTable<UserRow>
        columns={columns}
        rows={users as UserRow[]}
        showSearch
        searchKeys={["full_name", "email", "role"]}
        onRowClick={(row) => handleSelectUser(row as unknown as User)}
        emptyMessage="No team members yet. Click 'Add User' to get started."
        defaultPageSize={25}
      />

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div onClick={() => setShowAddModal(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 60, backdropFilter: "blur(2px)",
          }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: 440, backgroundColor: "#18181b", border: "1px solid #27272a",
            borderRadius: 12, padding: 24, zIndex: 61,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 20, marginTop: 0 }}>Add Team Member</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>First Name</label>
                <input
                  value={addForm.first_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Last Name</label>
                <input
                  value={addForm.last_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Email</label>
              <input
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
                placeholder="jane@schellbrothers.com"
                type="email"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  style={inputStyle}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Division</label>
                <select
                  value={addForm.division_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, division_id: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Select —</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {addError && (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 12 }}>⚠ {addError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowAddModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={handleAddUser}
                disabled={addSaving || !addForm.first_name || !addForm.last_name || !addForm.email}
                style={{
                  ...primaryBtnStyle,
                  opacity: addSaving || !addForm.first_name || !addForm.last_name || !addForm.email ? 0.5 : 1,
                }}
              >
                {addSaving ? "Adding…" : "Add User"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* User Detail Panel */}
      <SlideOver
        open={!!selectedUser}
        onClose={() => { setSelectedUser(null); setEditingIntegration(null); }}
        title={selectedUser?.full_name ?? ""}
        subtitle={selectedUser?.email ?? ""}
        badge={
          selectedUser ? (
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
              backgroundColor: selectedUser.is_active ? "#14532d" : "#7f1d1d",
              color: selectedUser.is_active ? "#86efac" : "#fca5a5",
            }}>
              {selectedUser.is_active ? "Active" : "Inactive"}
            </span>
          ) : undefined
        }
        width={560}
      >
        {selectedUser && (
          <>
            {/* Tabs */}
            <div style={{
              display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1f1f1f",
            }}>
              {(["profile", "integrations", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab)}
                  style={{
                    padding: "8px 16px", fontSize: 12, fontWeight: 500,
                    backgroundColor: "transparent", border: "none",
                    color: panelTab === tab ? "#fafafa" : "#52525b",
                    borderBottom: panelTab === tab ? "2px solid #80B602" : "2px solid transparent",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {panelTab === "profile" && (
              <div>
                <Section title="User Details">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>First Name</label>
                      <input
                        value={profileForm.first_name ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input
                        value={profileForm.last_name ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      value={profileForm.email ?? ""}
                      onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                      style={inputStyle}
                      type="email"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select
                        value={profileForm.role ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, role: e.target.value }))}
                        style={inputStyle}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Division</label>
                      <select
                        value={profileForm.division_id ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, division_id: e.target.value || null }))}
                        style={inputStyle}
                      >
                        <option value="">— None —</option>
                        {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Community</label>
                      <select
                        value={profileForm.community_id ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, community_id: e.target.value || null }))}
                        style={inputStyle}
                      >
                        <option value="">— None —</option>
                        {communities
                          .filter((c) => !profileForm.division_id || c.division_id === profileForm.division_id)
                          .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <input
                        value={profileForm.zoom_phone_number ?? ""}
                        onChange={(e) => setProfileForm((f) => ({ ...f, zoom_phone_number: e.target.value }))}
                        style={inputStyle}
                        placeholder="+1 302-555-0123"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Status">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Account Status</span>
                    <button
                      onClick={() => setProfileForm((f) => ({ ...f, is_active: !f.is_active }))}
                      style={{
                        padding: "4px 12px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 600,
                        cursor: "pointer",
                        backgroundColor: profileForm.is_active ? "#14532d" : "#7f1d1d",
                        color: profileForm.is_active ? "#86efac" : "#fca5a5",
                      }}
                    >
                      {profileForm.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                  <Row label="Created" value={selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "—"} />
                  <Row label="Last Updated" value={timeAgo(selectedUser.updated_at)} />
                </Section>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    style={{
                      ...primaryBtnStyle,
                      backgroundColor: profileSaved ? "#166534" : profileSaving ? "#3f3f46" : "#80B602",
                    }}
                  >
                    {profileSaving ? "Saving…" : profileSaved ? "Saved ✓" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {panelTab === "integrations" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {INTEGRATION_TYPES.map((intType) => {
                  const intMap = getUserIntegrationMap(selectedUser.id);
                  const integration = intMap.get(intType.key);
                  const isConnected = integration && integration.is_enabled;
                  const isEditing = editingIntegration === intType.key;

                  return (
                    <div
                      key={intType.key}
                      style={{
                        padding: 16, backgroundColor: "#18181b",
                        border: `1px solid ${isConnected ? intType.color + "44" : "#27272a"}`,
                        borderRadius: 8,
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{intType.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>{intType.label}</span>
                          {intType.note && (
                            <span style={{
                              padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 500,
                              backgroundColor: `${intType.color}22`, color: intType.color,
                            }}>
                              {intType.note}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {integration && (
                            <button
                              onClick={() => handleToggleIntegration(intType.key, !integration.is_enabled)}
                              style={{
                                width: 36, height: 20, borderRadius: 10, border: "none",
                                backgroundColor: integration.is_enabled ? "#80B602" : "#3f3f46",
                                cursor: "pointer", position: "relative",
                              }}
                            >
                              <div style={{
                                width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
                                position: "absolute", top: 2,
                                left: integration.is_enabled ? 18 : 2,
                                transition: "left 0.15s",
                              }} />
                            </button>
                          )}
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            backgroundColor: isConnected ? statusColor(integration?.sync_status ?? "never") : "#52525b",
                          }} />
                        </div>
                      </div>

                      {/* Status line */}
                      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>
                        Status: {statusLabel(integration?.sync_status ?? "never")}
                        {integration?.last_sync_at && (
                          <span> · Last sync: {timeAgo(integration.last_sync_at)}</span>
                        )}
                        {integration?.sync_error && (
                          <span style={{ color: "#ef4444" }}> · {integration.sync_error}</span>
                        )}
                      </div>

                      {/* Connected: show details */}
                      {integration && !isEditing && (
                        <div style={{ marginBottom: 8 }}>
                          {integration.account_id && (
                            <Row label="Account ID" value={integration.account_id} mono />
                          )}
                          {integration.external_user_id && (
                            <Row label="User ID" value={integration.external_user_id} mono />
                          )}
                          {intType.key.startsWith("zoom") && selectedUser.zoom_phone_number && (
                            <Row label="Phone" value={selectedUser.zoom_phone_number} mono />
                          )}
                          {integration.api_key && (
                            <Row label="API Key" value={integration.api_key} mono />
                          )}
                        </div>
                      )}

                      {/* Editing form */}
                      {isEditing && (
                        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          {renderIntegrationFields(intType.key)}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingIntegration(intType.key);
                              setIntegrationForm({
                                account_id: integration?.account_id ?? "",
                                external_user_id: integration?.external_user_id ?? "",
                                api_key: "",
                                api_secret: "",
                              });
                            }}
                            style={smallBtnStyle}
                          >
                            {integration ? "Edit" : "Connect"}
                          </button>
                        )}
                        {isEditing && (
                          <>
                            <button
                              onClick={() => handleSaveIntegration(intType.key)}
                              disabled={integrationSaving}
                              style={{ ...smallBtnStyle, backgroundColor: "#80B602", color: "#fff", borderColor: "#80B602" }}
                            >
                              {integrationSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => { setEditingIntegration(null); setIntegrationForm({}); }}
                              style={smallBtnStyle}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {integration && !isEditing && (
                          <button
                            onClick={() => handleDisconnect(intType.key)}
                            style={{ ...smallBtnStyle, color: "#ef4444", borderColor: "#7f1d1d" }}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Activity Tab */}
            {panelTab === "activity" && (
              <ActivityTab userId={selectedUser.id} />
            )}
          </>
        )}
      </SlideOver>
    </div>
  );

  // ─── Integration field renderers ──────────────────────────────────────────────

  function renderIntegrationFields(intType: string) {
    const fields: { key: string; label: string; placeholder: string }[] = [];

    switch (intType) {
      case "zoom_phone":
      case "zoom_sms":
      case "zoom_meeting":
        fields.push(
          { key: "account_id", label: "Zoom Account ID", placeholder: "BJ0E4dt8TbS..." },
          { key: "external_user_id", label: "Zoom User ID", placeholder: "abc123..." },
        );
        break;
      case "outlook":
        fields.push(
          { key: "account_id", label: "Tenant ID", placeholder: "Azure AD Tenant ID" },
          { key: "api_key", label: "Client ID", placeholder: "App Registration Client ID" },
          { key: "api_secret", label: "Client Secret", placeholder: "App Registration Secret" },
        );
        break;
      case "rilla":
        fields.push(
          { key: "api_key", label: "API Key", placeholder: "rilla_key_..." },
          { key: "external_user_id", label: "Rilla Agent ID", placeholder: "Agent/User ID in Rilla" },
        );
        break;
    }

    return fields.map((f) => (
      <div key={f.key}>
        <label style={labelStyle}>{f.label}</label>
        <input
          value={integrationForm[f.key] ?? ""}
          onChange={(e) => setIntegrationForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
          style={inputStyle}
          placeholder={f.placeholder}
        />
      </div>
    ));
  }
}

// ─── Activity Sub-component ─────────────────────────────────────────────────

function ActivityTab({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<Array<{
    id: string; channel: string; direction: string; subject: string | null;
    occurred_at: string; duration_sec: number | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("activities")
          .select("id, channel, direction, subject, occurred_at, duration_sec")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(20);
        setActivities(data ?? []);
      } catch {
        // activities table may not exist yet — graceful fallback
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return <div style={{ color: "#52525b", fontSize: 12, padding: 16 }}>Loading activity…</div>;
  }

  if (activities.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        <div style={{ fontSize: 13, color: "#52525b" }}>No synced activity yet</div>
        <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 4 }}>
          Activity will appear here once integrations are connected and syncing.
        </div>
      </div>
    );
  }

  const channelIcon: Record<string, string> = {
    call: "📞",
    sms: "💬",
    email: "📧",
    meeting: "🎥",
    rilla: "🎙️",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Summary */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 12, padding: 12,
        backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f",
      }}>
        {["call", "sms", "email", "meeting"].map((ch) => {
          const items = activities.filter((a) => a.channel === ch);
          const last = items[0];
          return (
            <div key={ch} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{channelIcon[ch] ?? "📋"}</div>
              <div style={{ fontSize: 11, color: "#a1a1aa" }}>{items.length}</div>
              <div style={{ fontSize: 9, color: "#52525b" }}>
                {last ? timeAgo(last.occurred_at) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      {activities.map((a) => (
        <div key={a.id} style={{
          padding: "8px 12px", backgroundColor: "#111", borderRadius: 6,
          border: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>{channelIcon[a.channel] ?? "📋"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#ededed" }}>
              {a.subject || `${a.direction === "inbound" ? "Incoming" : "Outgoing"} ${a.channel}`}
            </div>
            <div style={{ fontSize: 10, color: "#52525b" }}>
              {new Date(a.occurred_at).toLocaleString()}
              {a.duration_sec ? ` · ${Math.round(a.duration_sec / 60)}m` : ""}
            </div>
          </div>
          <span style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 4,
            backgroundColor: a.direction === "inbound" ? "#14532d" : "#1e293b",
            color: a.direction === "inbound" ? "#86efac" : "#93c5fd",
          }}>
            {a.direction ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "#09090b",
  border: "1px solid #27272a",
  borderRadius: 6,
  color: "#fafafa",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#71717a",
  display: "block",
  marginBottom: 4,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  backgroundColor: "#80B602",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #27272a",
  backgroundColor: "#18181b",
  color: "#a1a1aa",
  fontSize: 12,
  cursor: "pointer",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  border: "1px solid #27272a",
  backgroundColor: "transparent",
  color: "#a1a1aa",
  fontSize: 11,
  cursor: "pointer",
};
