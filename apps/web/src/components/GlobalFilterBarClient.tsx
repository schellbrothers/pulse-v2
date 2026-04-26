"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { DivisionOption, CommunityOption } from "./GlobalFilterBar";

interface UserOption {
  id: string;
  full_name: string;
}

interface Props {
  divisions: DivisionOption[];
  communities: CommunityOption[];
}

// ─── CompoundFilter ───────────────────────────────────────────────────────────

interface CompoundFilterProps {
  label: string;
  value: string | null;
  displayValue: string;
  count: number;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

function CompoundFilter({ label, value, displayValue, count, options, onChange, disabled, compact }: CompoundFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = !!value;

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        onTouchEnd={(e) => { if (!disabled) { e.preventDefault(); setOpen(!open); } }}
        style={{
          width: compact ? 130 : 170,
          height: compact ? 38 : 44,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          background: "#2a2b2e",
          border: `1px solid ${isActive ? "#80B602" : "#444"}`,
          borderRadius: 3,
          padding: "6px 10px",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: disabled ? 0.4 : 1,
          userSelect: "none" as const,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? "#80B602" : "#666" }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: isActive ? "#80B602" : "#666" }}>▾</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "#ededed" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isActive ? displayValue : `${count} available`}
        </div>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute",
            top: 48,
            left: 0,
            zIndex: 50,
            background: "#2a2b2e",
            border: "1px solid #333",
            borderRadius: 3,
            minWidth: 200,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            {isActive && (
              <div
                onClick={() => { onChange(null); setOpen(false); }}
                style={{ padding: "8px 12px", fontSize: 12, color: "#E32027", cursor: "pointer", borderBottom: "1px solid #222" }}
              >
                ✕ Clear
              </div>
            )}
            {options.map(opt => (
              <div
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  color: value === opt.id ? "#80B602" : "#aaa",
                  cursor: "pointer",
                  background: value === opt.id ? "rgba(128,182,2,0.08)" : "transparent",
                  borderBottom: "1px solid #111",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = value === opt.id ? "rgba(128,182,2,0.08)" : "transparent")}
              >
                {opt.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── GlobalFilterBarClient ────────────────────────────────────────────────────

export default function GlobalFilterBarClient({ divisions, communities }: Props) {
  const isMobile = useIsMobile();
  const { filter, setDivision, setCommunity, setUser, setLabels } =
    useGlobalFilter();

  const [users, setUsers] = useState<UserOption[]>([]);

  // Load users based on community or division selection
  useEffect(() => {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    if (filter.communityId) {
      // Get users assigned to this community via user_community_assignments
      sb.from("user_community_assignments")
        .select("user_id, users(id, full_name)")
        .eq("community_id", filter.communityId)
        .then(({ data }) => {
          const userList: UserOption[] = (data ?? [])
            .map((a: any) => {
              const u = Array.isArray(a.users) ? a.users[0] : a.users;
              return u ? { id: u.id, full_name: u.full_name } : null;
            })
            .filter(Boolean) as UserOption[];
          // Deduplicate
          const seen = new Set<string>();
          setUsers(userList.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; }));
        });
    } else if (filter.divisionId) {
      // Get all users in this division
      sb.from("users")
        .select("id, full_name")
        .eq("division_id", filter.divisionId)
        .order("full_name")
        .then(({ data }) => setUsers(data ?? []));
    } else {
      // No filter — get all users
      sb.from("users")
        .select("id, full_name")
        .order("full_name")
        .limit(100)
        .then(({ data }) => setUsers(data ?? []));
    }
  }, [filter.communityId, filter.divisionId]);

  useEffect(() => {
    const divLabel = divisions.find(d => d.id === filter.divisionId)?.name;
    const commLabel = communities.find(c => c.id === filter.communityId)?.name;
    const userLabel = users.find(u => u.id === filter.userId)?.full_name;
    if (typeof setLabels === "function") {
      setLabels({ division: divLabel, community: commLabel, user: userLabel });
    }
  }, [filter, divisions, communities, users, setLabels]);

  const filteredCommunities = filter.divisionId
    ? communities.filter(c => c.division_id === filter.divisionId)
    : communities;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 4 : 8,
      padding: isMobile ? "0 8px" : "0 16px",
      height: isMobile ? 48 : 56,
      background: "#0d0d0d",
      borderBottom: "1px solid #222",
      flexShrink: 0,
    }}>
      <CompoundFilter
        label="Division"
        value={filter.divisionId}
        displayValue={divisions.find(d => d.id === filter.divisionId)?.name ?? ""}
        count={divisions.length}
        options={divisions.map(d => ({ id: d.id, name: d.name }))}
        onChange={id => setDivision(id)}
        compact={isMobile}
      />
      <CompoundFilter
        label="Community"
        value={filter.communityId}
        displayValue={communities.find(c => c.id === filter.communityId)?.name ?? ""}
        count={filteredCommunities.length}
        options={filteredCommunities.map(c => ({ id: c.id, name: c.name }))}
        onChange={id => setCommunity(id)}
        compact={isMobile}
      />
      {!isMobile && (
        <CompoundFilter
          label="User"
          value={filter.userId}
          displayValue={users.find(u => u.id === filter.userId)?.full_name ?? ""}
          count={users.length}
          options={users.map(u => ({ id: u.id, name: u.full_name }))}
          onChange={id => setUser(id)}
        />
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: account */}
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#80B602", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>L</div>
          <span style={{ fontSize: 12, color: "#888" }}>Hello, Lance!</span>
        </div>
      )}
    </div>
  );
}
