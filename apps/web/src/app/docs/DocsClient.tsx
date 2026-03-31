"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import Link from "next/link";


interface Doc {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  sort_order: number;
  updated_at: string;
}

interface Props {
  docs: Doc[];
  initialSlug?: string;
}

const CATEGORIES = [
  { key: "all",       label: "All" },
  { key: "company",   label: "Company" },
  { key: "platform",  label: "Platform" },
  { key: "data",      label: "Data" },
  { key: "technical", label: "Technical" },
  { key: "processes", label: "Processes" },
  { key: "agent-os",  label: "Agent OS"  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  company:   { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f" },
  platform:  { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f" },
  data:      { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f" },
  technical: { bg: "#1f1a2e", text: "#a855f7", border: "#2a1f3f" },
  processes: { bg: "#2a1a1a", text: "#ff6b6b", border: "#3f1f1f" },
  general:   { bg: "#1a1a1a", text: "#666",    border: "#2a2a2a" },
  "agent-os": { bg: "#1a2a2a", text: "#00b4d8", border: "#1f3f3f" },
};

function CategoryBadge({ category }: { category: string }) {
  const s = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
  return (
    <span style={{
      fontSize: 10,
      padding: "1px 6px",
      borderRadius: 3,
      backgroundColor: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
      fontWeight: 500,
      textTransform: "capitalize" as const,
      flexShrink: 0,
    }}>
      {category}
    </span>
  );
}

function renderMarkdown(content: string): string {
  return content
    // Code blocks (must come before inline code)
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre style="background:#111111;border:1px solid #1f1f1f;border-radius:6px;padding:14px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:monospace;font-size:12px;color:#a1a1a1;line-height:1.6">$2</code></pre>'
    )
    // H1
    .replace(
      /^# (.+)$/gm,
      '<h1 style="color:#ededed;font-size:20px;font-weight:700;margin:0 0 16px;line-height:1.3">$1</h1>'
    )
    // H2
    .replace(
      /^## (.+)$/gm,
      '<h2 style="color:#ededed;font-size:15px;font-weight:600;margin:24px 0 10px;padding-top:24px;border-top:1px solid #1f1f1f">$1</h2>'
    )
    // H3
    .replace(
      /^### (.+)$/gm,
      '<h3 style="color:#a1a1a1;font-size:13px;font-weight:600;margin:16px 0 8px">$1</h3>'
    )
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ededed;font-weight:600">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#a1a1a1">$1</em>')
    // Code inline
    .replace(
      /`(.+?)`/g,
      '<code style="background:#161616;border:1px solid #2a2a2a;border-radius:3px;padding:1px 5px;font-family:monospace;font-size:11px;color:#a855f7">$1</code>'
    )
    // Links
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" style="color:#0070f3;text-decoration:none" target="_blank">$1</a>'
    )
    // Tables — convert rows (skip separator lines)
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.includes("---")) return "";
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      return `<tr>${cells
        .map(
          (c) =>
            `<td style="padding:6px 12px;border-bottom:1px solid #1a1a1a;color:#a1a1a1;font-size:12px">${c}</td>`
        )
        .join("")}</tr>`;
    })
    // Unordered list items
    .replace(
      /^- (.+)$/gm,
      '<li style="color:#a1a1a1;font-size:13px;margin:4px 0;padding-left:4px">$1</li>'
    )
    // Wrap consecutive <li> in <ul>
    .replace(
      /(<li[^>]*>.*<\/li>\n?)+/g,
      (m) => `<ul style="margin:8px 0;padding-left:20px;list-style:disc">${m}</ul>`
    )
    // Wrap consecutive <tr> in table
    .replace(
      /(<tr>.*<\/tr>\n?)+/g,
      (m) =>
        `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#111111;border:1px solid #1f1f1f;border-radius:6px">${m}</table></div>`
    )
    // Paragraphs (lines with content not already tagged)
    .replace(
      /^(?!<[hupldt])(.+)$/gm,
      '<p style="color:#a1a1a1;font-size:13px;line-height:1.7;margin:6px 0">$1</p>'
    )
    // Blank lines
    .replace(/^\s*$/gm, "");
}

export default function DocsClient({ docs }: Props) {
  const [localDocs, setLocalDocs] = useState(docs);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [showNewDoc, setShowNewDoc] = useState(false);

  // New doc form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("company");
  const [newContent, setNewContent] = useState("# Document Title\n\nWrite your content here...");
  const [saving, setSaving] = useState(false);
  // Edit mode state
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("company");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const filtered = localDocs
    .filter((d) => categoryFilter === "all" || d.category === categoryFilter)
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
    });

  function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o";
    return createClient(url, key);
  }

  async function handleCreateDoc() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const supabase = getSupabase();
      const { error } = await supabase.from("docs").insert([{
        slug: `${slug}-${Date.now()}`,
        title: newTitle,
        category: newCategory,
        content: newContent,
        sort_order: 99,
      }]);
      if (!error) {
        // Re-fetch docs from Supabase to get the new doc with its id
        const supabase2 = getSupabase();
        const { data: freshDocs } = await supabase2
          .from("docs")
          .select("id, slug, title, category, content, sort_order, updated_at")
          .eq("is_published", true)
          .order("category")
          .order("sort_order");
        if (freshDocs) setLocalDocs(freshDocs as typeof docs);
        setShowNewDoc(false);
        setNewTitle("");
        setNewContent("# Document Title\n\nWrite your content here...");
      } else {
        console.error("Create error:", error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditDoc() {
    if (!editingDoc || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("docs")
        .update({ title: editTitle, category: editCategory, content: editContent, updated_at: new Date().toISOString() })
        .eq("id", editingDoc.id);
      if (!error) {
        // Update local state immediately — no page reload needed
        const updated = { ...editingDoc!, title: editTitle, category: editCategory, content: editContent, updated_at: new Date().toISOString() };
        setLocalDocs(prev => prev.map(d => d.id === editingDoc!.id ? updated : d));
        setSelectedDoc(updated);
        setEditingDoc(null);
      } else {
        console.error("Edit error:", error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditSaving(false);
    }
  }

  function openEdit(doc: Doc) {
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditContent(doc.content);
    setEditingDoc(doc);
    setSelectedDoc(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
          <h1 className="text-[14px] font-semibold text-[#ededed]">Docs</h1>
          <span className="text-[11px] text-[#555]">{localDocs.length} documents</span>
        </div>

        {/* Filter tabs + search bar */}
        <div className="px-6 py-2 flex items-center gap-3 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-1 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.1s",
                  backgroundColor: categoryFilter === cat.key ? "#1a1a1a" : "transparent",
                  color: categoryFilter === cat.key ? "#ededed" : "#555",
                  outline: categoryFilter === cat.key ? "1px solid #2a2a2a" : "none",
                }}
              >
                {cat.key !== "all" && CATEGORY_COLORS[cat.key] && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: CATEGORY_COLORS[cat.key].text,
                    flexShrink: 0,
                  }} />
                )}
                {cat.label}
                <span style={{ fontSize: 10, color: "#444", marginLeft: 2 }}>
                  {cat.key === "all" ? docs.length : localDocs.filter(d => d.category === cat.key).length}
                </span>
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#444] whitespace-nowrap">
            {filtered.length} of {localDocs.length} docs
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-[12px] text-[#a1a1a1] placeholder-[#444] outline-none focus:border-[#3a3a3a] w-[200px]"
          />
          <button
            onClick={() => setShowNewDoc(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-colors whitespace-nowrap"
          >
            + New Document
          </button>
        </div>

        {/* Document list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#444", fontSize: 12 }}>
              No documents found
            </div>
          ) : (
            <div style={{ borderRadius: 8, border: "1px solid #1f1f1f", margin: "16px 24px 24px" }}>
              {filtered.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom: "1px solid #1a1a1a",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Doc icon */}
                  <span style={{ color: "#444", fontSize: 13, marginTop: 2, flexShrink: 0 }}>◧</span>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#ededed" }}>{d.title}</span>
                      <CategoryBadge category={d.category} />
                    </div>
                    <div style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.content.replace(/[#*`\n]/g, " ").trim().slice(0, 100)}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 11, color: "#444", flexShrink: 0, marginTop: 2 }}>
                    {new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Doc reader slide-over */}
      {selectedDoc !== null && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedDoc(null)}
          />
          <div className="fixed right-0 top-0 h-full w-[560px] bg-[#0f0f0f] border-l border-[#1f1f1f] overflow-y-auto z-50 flex flex-col">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#1f1f1f] flex items-start justify-between gap-4 sticky top-0 bg-[#0f0f0f] z-10">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold text-[#ededed] leading-snug">
                  {selectedDoc.title}
                </div>
                <div className="mt-1">
                  <CategoryBadge category={selectedDoc.category} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedDoc && openEdit(selectedDoc)}
                  className="text-[11px] px-3 py-1.5 rounded-md border border-[#2a2a2a] text-[#a1a1a1] hover:text-[#ededed] hover:border-[#3a3a3a] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-[#555] hover:text-[#ededed] text-[22px] leading-none flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="px-8 py-6 flex-1"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content) }}
            />

            {/* Footer */}
            <div className="px-8 py-4 border-t border-[#1f1f1f]">
              <div className="text-[11px] text-[#444]">
                Last updated:{" "}
                {new Date(selectedDoc.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Document Slide-over */}
      {editingDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditingDoc(null)} />
          <div className="fixed right-0 top-0 h-full w-[560px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold text-[#ededed] truncate">{editTitle || editingDoc.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <CategoryBadge category={editCategory} />
                  <span className="text-[11px] text-[#555]">Editing</span>
                </div>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-[#555] hover:text-[#ededed] text-[22px] leading-none flex-shrink-0">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Title</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[13px] text-[#ededed] outline-none focus:border-[#3a3a3a]" />
              </div>
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[13px] text-[#a1a1a1] outline-none">
                  <option value="company">Company</option>
                  <option value="platform">Platform</option>
                  <option value="data">Data</option>
                  <option value="technical">Technical</option>
                  <option value="processes">Processes</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Content (Markdown)</label>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={18}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[12px] text-[#a1a1a1] font-mono outline-none focus:border-[#3a3a3a] resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#1f1f1f]">
              <button onClick={handleEditDoc} disabled={!editTitle.trim() || editSaving}
                className="w-full flex items-center justify-center bg-[#ededed] text-[#0a0a0a] rounded-lg py-3 text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* New Document slide-over */}
      {showNewDoc && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNewDoc(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[560px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold text-[#ededed]">New Document</div>
                <div className="text-[11px] text-[#555] mt-0.5">Saved to Knowledge Base</div>
              </div>
              <button
                onClick={() => setShowNewDoc(false)}
                className="text-[#555] hover:text-[#ededed] text-[22px] leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Title */}
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">
                  Title
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Document title..."
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[13px] text-[#ededed] placeholder-[#444] outline-none focus:border-[#3a3a3a]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[13px] text-[#a1a1a1] outline-none"
                >
                  <option value="company">Company</option>
                  <option value="platform">Platform</option>
                  <option value="data">Data</option>
                  <option value="technical">Technical</option>
                  <option value="processes">Processes</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Content */}
              <div className="flex-1">
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">
                  Content (Markdown)
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={18}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[12px] text-[#a1a1a1] font-mono placeholder-[#444] outline-none focus:border-[#3a3a3a] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1f1f1f]">
              <button
                onClick={handleCreateDoc}
                disabled={!newTitle.trim() || saving}
                className="w-full flex items-center justify-center gap-2 bg-[#ededed] text-[#0a0a0a] rounded-lg py-3 text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Creating..." : "+ Create Document"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
