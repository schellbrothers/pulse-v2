"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { TaskDetail, TaskStatus } from "@/types/tasks";

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  planning:     { bg: "#1a1a2e", text: "#818cf8", border: "#2a2a4f" },
  needs_review: { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f" },
  approved:     { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f" },
  in_process:   { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f" },
  blocked:      { bg: "#2a1a1a", text: "#ff6b6b", border: "#3f1f1f" },
  preview:      { bg: "#1f1a2e", text: "#a855f7", border: "#2a1f3f" },
  completed:    { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f" },
  cancelled:    { bg: "#1a1a1a", text: "#555",    border: "#2a2a2a" },
};

interface Props { taskId: string | null; onClose: () => void; }

export default function TaskDetailPanel({ taskId, onClose }: Props) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "docs" | "history">("overview");

  useEffect(() => {
    if (!taskId) { setTask(null); return; }
    setLoading(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
    );
    Promise.all([
      supabase.from("hbx_tasks").select("*").eq("id", taskId).single(),
      supabase.from("hbx_task_documents").select("*").eq("task_id", taskId).order("created_at"),
      supabase.from("hbx_task_history").select("*").eq("task_id", taskId).order("changed_at"),
    ]).then(([{ data: task }, { data: documents }, { data: history }]) => {
      if (task) setTask({ ...task, documents: documents ?? [], history: history ?? [] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [taskId]);

  async function approveTask() {
    if (!task) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
    );
    await supabase.from("hbx_tasks").update({ status: "approved" }).eq("id", task.id);
    await supabase.from("hbx_task_history").insert([{
      task_id: task.id, previous_status: task.status,
      new_status: "approved", changed_by: "lance",
      note: "Approved via task board",
    }]);
    // Refresh task
    const { data } = await supabase.from("hbx_tasks").select("*").eq("id", task.id).single();
    const { data: documents } = await supabase.from("hbx_task_documents").select("*").eq("task_id", task.id).order("created_at");
    const { data: history } = await supabase.from("hbx_task_history").select("*").eq("task_id", task.id).order("changed_at");
    if (data) setTask({ ...data, documents: documents ?? [], history: history ?? [] });
  }

  if (!taskId) return null;

  const s = task ? STATUS_COLORS[task.status] : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[560px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-[13px] text-[#555]">Loading...</div>
            ) : task ? (
              <>
                <div className="text-[16px] font-semibold text-[#ededed] truncate">{task.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  {s && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
                      backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontWeight: 500 }}>
                      {task.status.replace("_", " ")}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#555" }}>
                    {task.task_type === "feature" ? "◈ Feature" : "⚡ Bugfix"}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#ededed] text-[22px] leading-none flex-shrink-0">×</button>
        </div>

        {/* Tabs */}
        {task && (
          <div className="flex border-b border-[#1f1f1f] flex-shrink-0">
            {(["overview", "docs", "history"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-[12px] transition-colors ${
                  activeTab === tab ? "text-[#ededed] border-b-2 border-[#ededed]" : "text-[#555] hover:text-[#a1a1a1]"
                }`}>
                {tab === "overview" ? "Overview" : tab === "docs" ? `Docs (${task.documents.length})` : `History (${task.history.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!task && !loading && <div className="text-[12px] text-[#555]">Task not found.</div>}
          {task && activeTab === "overview" && (
            <div className="space-y-5">
              {task.status === "needs_review" && (
                <div className="mb-4">
                  <button onClick={approveTask}
                    className="w-full flex items-center justify-center gap-2 bg-[#00843d] text-white rounded-lg py-2.5 text-[13px] font-semibold hover:bg-[#006630] transition-colors">
                    ✓ Approve — Send to Build
                  </button>
                  <div className="text-[10px] text-[#555] text-center mt-1.5">Moves task to Approved status</div>
                </div>
              )}
              {task.description && (
                <div>
                  <div className="text-[10px] font-medium text-[#444] uppercase tracking-widest mb-2">Description</div>
                  <p className="text-[12px] text-[#a1a1a1] leading-relaxed">{task.description}</p>
                </div>
              )}
              {task.blocked_reason && (
                <div className="rounded-lg border border-[#3f1f1f] bg-[#1a0a0a] p-3">
                  <div className="text-[10px] font-medium text-[#ff6b6b] uppercase tracking-widest mb-1">Blocked</div>
                  <p className="text-[12px] text-[#a1a1a1]">{task.blocked_reason}</p>
                </div>
              )}
              <div>
                <div className="text-[10px] font-medium text-[#444] uppercase tracking-widest mb-3">Details</div>
                {[
                  { label: "Type",       value: task.task_type },
                  { label: "Branch",     value: task.branch_name },
                  { label: "Repo",       value: task.github_repo },
                  { label: "Created",    value: new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                  { label: "Updated",    value: new Date(task.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) },
                  { label: "Completed",  value: task.completed_at ? new Date(task.completed_at).toLocaleDateString() : null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex justify-between py-1.5 border-b border-[#161616]">
                    <span className="text-[11px] text-[#555]">{r.label}</span>
                    <span className="text-[11px] text-[#a1a1a1]">{r.value}</span>
                  </div>
                ))}
              </div>
              {(task.pr_url || task.vercel_preview_url) && (
                <div>
                  <div className="text-[10px] font-medium text-[#444] uppercase tracking-widest mb-2">Links</div>
                  <div className="flex flex-wrap gap-2">
                    {task.pr_url && (
                      <a href={task.pr_url} target="_blank" rel="noreferrer"
                        className="text-[11px] px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1a1] no-underline hover:text-[#ededed]">
                        ↗ Pull Request #{task.pr_number}
                      </a>
                    )}
                    {task.vercel_preview_url && (
                      <a href={task.vercel_preview_url} target="_blank" rel="noreferrer"
                        className="text-[11px] px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1a1] no-underline hover:text-[#ededed]">
                        ◈ Preview
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {task && activeTab === "docs" && (
            <div className="space-y-3">
              {task.documents.length === 0 ? (
                <div className="text-[12px] text-[#555]">No documents attached.</div>
              ) : task.documents.map(doc => (
                <div key={doc.id} className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-[#ededed]">{doc.file_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#555]">{doc.doc_type}</span>
                  </div>
                  <pre className="text-[11px] text-[#666] whitespace-pre-wrap overflow-x-auto">{doc.content.slice(0, 500)}{doc.content.length > 500 ? "..." : ""}</pre>
                </div>
              ))}
            </div>
          )}
          {task && activeTab === "history" && (
            <div className="space-y-2">
              {task.history.length === 0 ? (
                <div className="text-[12px] text-[#555]">No history yet.</div>
              ) : [...task.history].reverse().map(h => {
                const sc = STATUS_COLORS[h.new_status as TaskStatus];
                return (
                  <div key={h.id} className="flex items-start gap-3 py-2 border-b border-[#1a1a1a]">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: sc?.text ?? "#555" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#a1a1a1]">
                        {h.previous_status ? <span className="text-[#555]">{h.previous_status.replace("_"," ")} → </span> : null}
                        <span style={{ color: sc?.text ?? "#a1a1a1" }}>{h.new_status.replace("_"," ")}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-[#444]">by</span>
                        <span className="text-[11px] font-medium" style={{ color: sc?.text ?? "#555" }}>{h.changed_by}</span>
                      </div>
                      {h.note && <div className="text-[11px] text-[#555] mt-0.5">{h.note}</div>}
                    </div>
                    <div className="text-[10px] text-[#444] flex-shrink-0">
                      {new Date(h.changed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
