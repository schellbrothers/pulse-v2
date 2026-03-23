"use client";

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

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "/leads"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
  { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
  { icon: "📄", label: "Docs",          href: "/docs"        },
];

const CATEGORIES = [
  { key: "all",       label: "All" },
  { key: "company",   label: "Company" },
  { key: "platform",  label: "Platform" },
  { key: "data",      label: "Data" },
  { key: "technical", label: "Technical" },
  { key: "processes", label: "Processes" },
];

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

  const filtered = docs
    .filter((d) => categoryFilter === "all" || d.category === categoryFilter)
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
    });

  async function handleCreateDoc() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: `${slug}-${Date.now()}`,
          title: newTitle,
          category: newCategory,
          content: newContent,
          sort_order: 99,
        }),
      });
      if (res.ok) {
        setShowNewDoc(false);
        setNewTitle("");
        setNewContent("# Document Title\n\nWrite your content here...");
        window.location.reload();
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
      const res = await fetch(`/api/docs/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, category: editCategory, content: editContent }),
      });
      if (res.ok) {
        setEditingDoc(null);
        setSelectedDoc(null);
        window.location.reload();
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
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Global nav sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] h-screen sticky top-0">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="text-base">🦞</span>
            <div>
              <span className="font-semibold text-[13px] text-[#ededed]">Pulse v2</span>
              <div className="text-[10px] text-[#555]">HBx AI Factory</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                item.href === "/docs"
                  ? "bg-[#1a1a1a] text-[#ededed]"
                  : "text-[#888] hover:text-[#ededed] hover:bg-[#111111]"
              }`}
            >
              <span className="text-[14px] w-4 text-center opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs">
                🦞
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00c853] rounded-full border border-[#0a0a0a] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#ededed] truncate">Schellie</div>
              <div className="text-[11px] text-[#555] truncate">Orchestrator · Online</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
          <h1 className="text-[14px] font-semibold text-[#ededed]">Docs</h1>
          <button
            onClick={() => setShowNewDoc(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-colors"
          >
            + New Document
          </button>
        </div>

        {/* Filter tabs + search bar */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-3 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-1 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`text-[12px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  categoryFilter === cat.key
                    ? "bg-[#1a1a1a] text-[#ededed] border border-[#2a2a2a]"
                    : "text-[#555] hover:text-[#a1a1a1]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="bg-[#111111] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-[12px] text-[#a1a1a1] placeholder-[#444] outline-none focus:border-[#3a3a3a] w-[200px]"
          />
        </div>

        {/* Doc count */}
        <div className="px-6 py-3">
          <span className="text-[12px] text-[#555]">{filtered.length} documents</span>
        </div>

        {/* Document list */}
        <div className="px-6 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-[13px] text-[#444] py-8 text-center">No documents found.</div>
          ) : (
            filtered.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDoc(d)}
                className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-5 py-4 cursor-pointer hover:border-[#2a2a2a] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#ededed]">{d.title}</div>
                    <div className="text-[12px] text-[#555] mt-1 line-clamp-2">
                      {d.content.replace(/[#*`]/g, "").trim().slice(0, 120)}...
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] whitespace-nowrap flex-shrink-0">
                    {d.category}
                  </span>
                </div>
                <div className="text-[11px] text-[#444] mt-3">
                  Updated{" "}
                  {new Date(d.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))
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
          <div className="fixed right-0 top-0 h-full w-[600px] bg-[#0f0f0f] border-l border-[#1f1f1f] overflow-y-auto z-50 flex flex-col">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#1f1f1f] flex items-start justify-between gap-4 sticky top-0 bg-[#0f0f0f] z-10">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold text-[#ededed] leading-snug">
                  {selectedDoc.title}
                </div>
                <div className="mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#555]">
                    {selectedDoc.category}
                  </span>
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

      {/* New Document slide-over */}
      {/* Edit Document Slide-over */}
      {editingDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditingDoc(null)} />
          <div className="fixed right-0 top-0 h-full w-[520px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[18px]">✏️</div>
                <div>
                  <div className="text-[14px] font-semibold text-[#ededed]">Edit Document</div>
                  <div className="text-[11px] text-[#555]">{editingDoc.title}</div>
                </div>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-[#555] hover:text-[#ededed] text-[20px] leading-none">×</button>
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

      {showNewDoc && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNewDoc(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[520px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[18px]">
                  📄
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#ededed]">New Document</div>
                  <div className="text-[11px] text-[#555]">Saved to Knowledge Base</div>
                </div>
              </div>
              <button
                onClick={() => setShowNewDoc(false)}
                className="text-[#555] hover:text-[#ededed] text-[20px] leading-none"
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
