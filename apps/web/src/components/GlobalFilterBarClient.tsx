"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { DivisionOption, CommunityOption } from "./GlobalFilterBar";
import OpportunitySearch from "@/components/OpportunitySearch";

type WorkspaceContext = "osc" | "csm" | "dsm" | "marketing" | "other";

function getWorkspaceContext(pathname: string): WorkspaceContext {
  if (pathname.startsWith("/workspace/osc")) return "osc";
  if (pathname.startsWith("/workspace/csm")) return "csm";
  if (pathname.startsWith("/workspace/dsm")) return "dsm";
  if (pathname.startsWith("/workspace/marketing")) return "marketing";
  return "other";
}

interface UserOption {
  id: string;
  full_name: string;
  division_id?: string | null;
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
          width: compact ? 110 : 170,
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
        <div style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? "#ededed" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

export default function GlobalFilterBarClient({ divisions, communities }: Props) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const workspace = getWorkspaceContext(pathname);
  const { filter, setDivision, setCommunity, setUser, setLabels } = useGlobalFilter();

  // Workspace-specific visibility
  const showCommunity = workspace !== "osc"; // OSC: no community filter
  const showUser = workspace !== "marketing"; // Marketing: no user filter
  // User role filter: OSC page shows OSC users, CSM page shows CSM users
  const userRoleFilter = workspace === "osc" ? "osc" : workspace === "csm" ? "csm" : null;

  // All users (for unfiltered dropdown + reverse lookup)
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  // User→community assignments for reverse lookup
  const [userCommunities, setUserCommunities] = useState<Record<string, string[]>>({});
  // Visible users in dropdown (filtered by div/community)
  const [visibleUsers, setVisibleUsers] = useState<UserOption[]>([]);

  // Load all users + assignments once (re-load when workspace changes for role filter)
  useEffect(() => {
    let userQuery = sb.from("users").select("id, full_name, division_id, role").order("full_name");
    if (userRoleFilter) {
      userQuery = userQuery.eq("role", userRoleFilter);
    }
    Promise.all([
      userQuery,
      sb.from("user_community_assignments").select("user_id, community_id"),
    ]).then(([usersRes, assignRes]) => {
      setAllUsers((usersRes.data ?? []) as UserOption[]);
      // Build user→communities map
      const map: Record<string, string[]> = {};
      for (const a of (assignRes.data ?? []) as { user_id: string; community_id: string }[]) {
        if (!map[a.user_id]) map[a.user_id] = [];
        map[a.user_id].push(a.community_id);
      }
      setUserCommunities(map);
    });
  }, [userRoleFilter]);

  // Update visible users when filter changes
  useEffect(() => {
    if (filter.communityId) {
      // Users assigned to this community
      const communityUserIds = new Set(
        Object.entries(userCommunities)
          .filter(([, comms]) => comms.includes(filter.communityId!))
          .map(([uid]) => uid)
      );
      setVisibleUsers(allUsers.filter(u => communityUserIds.has(u.id)));
    } else if (filter.divisionId) {
      setVisibleUsers(allUsers.filter(u => u.division_id === filter.divisionId));
    } else {
      setVisibleUsers(allUsers);
    }
  }, [filter.communityId, filter.divisionId, allUsers, userCommunities]);

  // Reverse lookup: when user is selected directly, auto-set division/community
  const handleUserSelect = useCallback((userId: string | null) => {
    if (!userId) {
      setUser(null);
      return;
    }

    const user = allUsers.find(u => u.id === userId);
    if (!user) { setUser(userId); return; }

    // If no division set, auto-set from user's division
    if (!filter.divisionId && user.division_id) {
      setDivision(user.division_id);
    }

    // Auto-set community only if user has exactly ONE community
    const userComms = userCommunities[userId] ?? [];
    if (!filter.communityId && userComms.length === 1) {
      const targetComm = userComms[0];
      const comm = communities.find(c => c.id === targetComm);
      if (comm) {
        if (!filter.divisionId) {
          setDivision(comm.division_id);
        }
        setTimeout(() => setCommunity(targetComm), 0);
      }
    } else if (!filter.communityId && userComms.length > 1) {
      // Multiple communities — set division only, user picks community
      const commDivs = userComms.map(cid => communities.find(c => c.id === cid)?.division_id).filter(Boolean);
      const uniqueDivs = [...new Set(commDivs)];
      if (!filter.divisionId && uniqueDivs.length === 1 && uniqueDivs[0]) {
        setDivision(uniqueDivs[0]);
      }
      // Do NOT auto-select community
    }

    // Set user immediately (don't delay)
    setUser(userId);
  }, [allUsers, userCommunities, communities, filter.divisionId, filter.communityId, setDivision, setCommunity, setUser]);

  // Labels
  useEffect(() => {
    const divLabel = divisions.find(d => d.id === filter.divisionId)?.name;
    const commLabel = communities.find(c => c.id === filter.communityId)?.name;
    const userLabel = allUsers.find(u => u.id === filter.userId)?.full_name;
    if (typeof setLabels === "function") {
      setLabels({ division: divLabel, community: commLabel, user: userLabel });
    }
  }, [filter, divisions, communities, allUsers, setLabels]);

  // When user is selected, show only their assigned communities
  // When division is selected, show communities in that division
  // Otherwise show all
  const userCommIds = filter.userId && userCommunities[filter.userId]?.length
    ? new Set(userCommunities[filter.userId])
    : null;
  const filteredCommunities = userCommIds && userCommIds.size > 0
    ? communities.filter(c => userCommIds.has(c.id))
    : filter.divisionId
      ? communities.filter(c => c.division_id === filter.divisionId)
      : communities;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 4 : 8,
      padding: isMobile ? "0 4px" : "0 16px",
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
      {showCommunity && (
        <CompoundFilter
          label="Community"
          value={filter.communityId}
          displayValue={communities.find(c => c.id === filter.communityId)?.name ?? ""}
          count={filteredCommunities.length}
          options={(filter.divisionId ? filteredCommunities : communities).map(c => ({ id: c.id, name: c.name }))}
          onChange={id => {
            if (id && !filter.divisionId) {
              const comm = communities.find(c => c.id === id);
              if (comm?.division_id) setDivision(comm.division_id);
              setTimeout(() => setCommunity(id), 0);
            } else {
              setCommunity(id);
            }
          }}
          compact={isMobile}
        />
      )}
      {showUser && (
        <CompoundFilter
          label="User"
          value={filter.userId}
          displayValue={allUsers.find(u => u.id === filter.userId)?.full_name ?? ""}
          count={visibleUsers.length}
          options={visibleUsers.map(u => ({ id: u.id, name: u.full_name }))}
          onChange={handleUserSelect}
          compact={isMobile}
        />
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Opportunity Search */}
      <OpportunitySearch />

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
