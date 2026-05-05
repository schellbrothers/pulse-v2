"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import OpportunityPanel, { type OpportunityPanelData, StageBadge } from "@/components/OpportunityPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  contact_id: string | null;
  crm_stage: string;
  source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  community_name: string | null;
  division_name: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpportunitySearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelData, setPanelData] = useState<OpportunityPanelData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    const searchTerm = q.trim().toLowerCase();

    // Search contacts by name, email, or phone
    // Use ilike for fuzzy matching
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(20);

    if (!contacts || contacts.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const contactIds = contacts.map(c => c.id);

    // Get opportunities for these contacts
    const { data: opps } = await supabase
      .from("opportunities")
      .select("id, contact_id, crm_stage, source, budget_min, budget_max, notes, last_activity_at, created_at, community_id, division_id, communities(name), divisions(name)")
      .in("contact_id", contactIds)
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false })
      .limit(25);

    // Merge contact data into results
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    const merged: SearchResult[] = (opps ?? []).map((opp: any) => {
      const contact = contactMap.get(opp.contact_id) ?? { first_name: "—", last_name: "", email: null, phone: null };
      const comm = Array.isArray(opp.communities) ? opp.communities[0] : opp.communities;
      const div = Array.isArray(opp.divisions) ? opp.divisions[0] : opp.divisions;
      return {
        id: opp.id,
        contact_id: opp.contact_id,
        crm_stage: opp.crm_stage ?? "queue",
        source: opp.source,
        budget_min: opp.budget_min,
        budget_max: opp.budget_max,
        notes: opp.notes,
        last_activity_at: opp.last_activity_at,
        created_at: opp.created_at,
        first_name: contact.first_name ?? "—",
        last_name: contact.last_name ?? "",
        email: contact.email,
        phone: contact.phone,
        community_name: comm?.name ?? null,
        division_name: div?.name ?? null,
      };
    });

    setResults(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  function openOpportunity(result: SearchResult) {
    setPanelData({
      id: result.id,
      contact_id: result.contact_id,
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      phone: result.phone,
      stage: result.crm_stage,
      source: result.source,
      community_name: result.community_name,
      division_name: result.division_name,
      budget_min: result.budget_min,
      budget_max: result.budget_max,
      floor_plan_name: null,
      notes: result.notes,
      last_activity_at: result.last_activity_at,
      created_at: result.created_at,
    });
    setOpen(false);
    setQuery("");
  }

  // Highlight matched text
  function highlight(text: string | null, q: string): React.ReactNode {
    if (!text || !q.trim()) return text ?? "—";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ backgroundColor: "#f59e0b33", color: "#fbbf24", fontWeight: 600 }}>{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <>
      {/* Search trigger button */}
      <div ref={containerRef} style={{ position: "relative" }}>
        <button
          onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: open ? "#2a2b2e" : "transparent",
            border: `1px solid ${open ? "#555" : "#333"}`,
            borderRadius: 6,
            cursor: "pointer",
            color: "#888",
            fontSize: 12,
            transition: "all 0.15s",
          }}
          title="Search opportunities (⌘K)"
        >
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ color: "#666", fontSize: 11 }}>Search...</span>
          <kbd style={{
            fontSize: 9,
            padding: "1px 4px",
            borderRadius: 3,
            border: "1px solid #444",
            color: "#666",
            background: "#1a1a1a",
            marginLeft: 4,
          }}>⌘K</kbd>
        </button>

        {/* Search dropdown */}
        {open && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: 480,
            maxHeight: 500,
            background: "#1a1a1c",
            border: "1px solid #333",
            borderRadius: 8,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Search input */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #27272a" }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 6,
                  color: "#ededed",
                  fontSize: 13,
                  outline: "none",
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") { setOpen(false); }
                }}
              />
            </div>

            {/* Results */}
            <div style={{ overflowY: "auto", maxHeight: 420 }}>
              {loading && (
                <div style={{ padding: "16px 12px", textAlign: "center", fontSize: 12, color: "#52525b" }}>
                  Searching...
                </div>
              )}

              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div style={{ padding: "16px 12px", textAlign: "center", fontSize: 12, color: "#52525b" }}>
                  No opportunities found
                </div>
              )}

              {!loading && query.trim().length < 2 && (
                <div style={{ padding: "16px 12px", textAlign: "center", fontSize: 11, color: "#3f3f46" }}>
                  Type at least 2 characters to search
                </div>
              )}

              {results.map(r => (
                <div
                  key={r.id}
                  onClick={() => openOpportunity(r)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #1f1f1f",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#27272a")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>
                      {highlight(`${r.first_name} ${r.last_name}`, query)}
                    </span>
                    <StageBadge stage={r.crm_stage} />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {r.email && (
                      <span style={{ fontSize: 11, color: "#71717a" }}>
                        ✉ {highlight(r.email, query)}
                      </span>
                    )}
                    {r.phone && (
                      <span style={{ fontSize: 11, color: "#71717a" }}>
                        📞 {highlight(r.phone, query)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    {r.community_name && (
                      <span style={{ fontSize: 10, color: "#52525b" }}>
                        {r.community_name}
                      </span>
                    )}
                    {r.division_name && (
                      <span style={{ fontSize: 10, color: "#52525b" }}>
                        {r.division_name}
                      </span>
                    )}
                    {r.last_activity_at && (
                      <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>
                        Last activity: {new Date(r.last_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Opportunity Panel */}
      {panelData && (
        <OpportunityPanel
          open={!!panelData}
          onClose={() => setPanelData(null)}
          opportunity={panelData}
        />
      )}
    </>
  );
}
