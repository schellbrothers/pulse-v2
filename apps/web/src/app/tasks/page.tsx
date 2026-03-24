"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import type { Task, TaskStatus, TaskType } from "@/types/tasks";

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string; label: string }> = {
  planning:     { bg: "#1a1a2e", text: "#818cf8", border: "#2a2a4f", label: "Planning" },
  needs_review: { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f", label: "Needs Review" },
  approved:     { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f", label: "Approved" },
  in_process:   { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f", label: "In Process" },
  blocked:      { bg: "#2a1a1a", text: "#ff6b6b", border: "#3f1f1f", label: "Blocked" },
  preview:      { bg: "#1f1a2e", text: "#a855f7", border: "#2a1f3f", label: "Preview" },
  completed:    { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f", label: "Completed" },
  cancelled:    { bg: "#1a1a1a", text: "#555",    border: "#2a2a2a", label: "Cancelled" },
};

const COLUMN_ORDER: TaskStatus[] = ["planning", "needs_review", "approved", "in_process", "blocked", "preview", "completed", "cancelled"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<TaskType>("feature");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [search, setSearch] = useState("");

  const fetchTasks = useCallback(async () => {
    const r = await fetch("/api/tasks");
    const data = await r.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime subscription — board updates live without refresh
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
    );
    const channel = supabase
      .channel("hbx_tasks_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "hbx_tasks" }, () => {
        fetchTasks(); // re-fetch on any change
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(t => {
    if (filter === "active" && ["completed", "cancelled"].includes(t.status)) return false;
    if (filter === "done" && !["completed", "cancelled"].includes(t.status)) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns = COLUMN_ORDER.map(status => ({
    status,
    ...STATUS_COLORS[status],
    tasks: filteredTasks.filter(t => t.status === status),
  })).filter(col => filter === "active" ? !["completed", "cancelled"].includes(col.status) :
                    filter === "done"   ? ["completed", "cancelled"].includes(col.status) : true);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc || null, task_type: newType }),
    });
    const task = await res.json();
    // Notify Schellie — triggers automatic planning workflow
    if (task?.id) {
      fetch("/api/tasks/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          task_name: newName,
          task_type: newType,
          description: newDesc || null,
        }),
      }).catch(() => {}); // fire-and-forget
    }
    setNewName(""); setNewDesc(""); setNewType("feature");
    setShowNew(false); setCreating(false);
    fetchTasks();
  }

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !["completed","cancelled"].includes(t.status)).length,
    inProcess: tasks.filter(t => t.status === "in_process").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/tasks" />
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-semibold text-[#ededed]">Tasks</h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#555]">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="bg-[#111] border border-[#2a2a2a] text-[#a1a1a1] text-[11px] rounded px-3 py-1.5 outline-none w-[180px] placeholder:text-[#444]" />
            {(["all","active","done"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[11px] px-3 py-1.5 rounded transition-colors ${filter === f ? "bg-[#1a1a1a] text-[#ededed] border border-[#2a2a2a]" : "text-[#555] hover:text-[#a1a1a1]"}`}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-colors">
              + New Task
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display:"flex", alignItems:"center", gap:20, padding:"6px 24px",
          backgroundColor:"#0d0d0d", borderBottom:"1px solid #1a1a1a", flexShrink:0 }}>
          {[
            { label:"Total",      value:stats.total,     color:"#666" },
            { label:"Active",     value:stats.active,    color:"#a1a1a1" },
            { label:"In Process", value:stats.inProcess, color:"#0070f3" },
            { label:"Blocked",    value:stats.blocked,   color:"#ff6b6b" },
            { label:"Completed",  value:stats.completed, color:"#00c853" },
          ].map(s => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:"#555" }}>{s.label}:</span>
              <span style={{ fontSize:12, fontWeight:600, color:s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ display:"flex", gap:12, padding:"16px 24px", height:"100%", minWidth: columns.length * 220 }}>
            {loading ? (
              <div className="text-[12px] text-[#555] flex items-center">Loading tasks...</div>
            ) : columns.map(col => (
              <div key={col.status} style={{ width:220, flexShrink:0, display:"flex", flexDirection:"column" }}>
                {/* Column header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:8, padding:"0 2px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor:col.text }} />
                    <span style={{ fontSize:11, fontWeight:600, color:col.text, textTransform:"uppercase",
                      letterSpacing:"0.06em" }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:11, color:"#444" }}>{col.tasks.length}</span>
                </div>

                {/* Task cards */}
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                  {col.tasks.length === 0 ? (
                    <div style={{ padding:"16px 8px", textAlign:"center", fontSize:11, color:"#333" }}>—</div>
                  ) : col.tasks.map(task => (
                    <div key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{ borderRadius:8, border:"1px solid #1f1f1f", backgroundColor:"#111111",
                        padding:"10px 12px", cursor:"pointer", transition:"border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}>
                      <div style={{ fontSize:12, fontWeight:500, color:"#ededed", marginBottom:6,
                        lineHeight:1.4 }}>{task.name}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3,
                          backgroundColor: task.task_type === "feature" ? "#1a1f2e" : "#2a1a1a",
                          color: task.task_type === "feature" ? "#0070f3" : "#ff6b6b",
                          border: `1px solid ${task.task_type === "feature" ? "#1a2a3f" : "#3f1f1f"}` }}>
                          {task.task_type}
                        </span>
                        {task.branch_name && (
                          <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>
                            {task.branch_name.slice(0,18)}{task.branch_name.length > 18 ? "…" : ""}
                          </span>
                        )}
                      </div>
                      {task.blocked_reason && (
                        <div style={{ fontSize:10, color:"#ff6b6b", marginTop:4, lineHeight:1.3 }}>
                          ⚠ {task.blocked_reason.slice(0,60)}
                        </div>
                      )}
                      <div style={{ fontSize:10, color:"#444", marginTop:6 }}>
                        {new Date(task.updated_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* New Task Slide-Over */}
      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNew(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-start justify-between gap-4">
              <div>
                <div className="text-[16px] font-semibold text-[#ededed]">New Task</div>
                <div className="text-[11px] text-[#555] mt-0.5">Add to planning pipeline</div>
              </div>
              <button onClick={() => setShowNew(false)} className="text-[#555] hover:text-[#ededed] text-[22px] leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Task Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="What needs to be built?"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[13px] text-[#ededed] placeholder:text-[#444] outline-none focus:border-[#3a3a3a]" />
              </div>
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Type</label>
                <div className="flex gap-3">
                  {(["feature","bugfix"] as TaskType[]).map(t => (
                    <button key={t} onClick={() => setNewType(t)}
                      style={{ flex:1, padding:"8px 0", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
                        border: newType === t ? "1px solid #2a2a2a" : "1px solid #1f1f1f",
                        backgroundColor: newType === t ? "#1a1a1a" : "transparent",
                        color: newType === t ? "#ededed" : "#555" }}>
                      {t === "feature" ? "◈ Feature" : "⚡ Bugfix"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#555] uppercase tracking-widest mb-2 block">Description (optional)</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  rows={4} placeholder="What does this task involve?"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[12px] text-[#a1a1a1] placeholder:text-[#444] outline-none focus:border-[#3a3a3a] resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#1f1f1f]">
              <button onClick={handleCreate} disabled={!newName.trim() || creating}
                className="w-full flex items-center justify-center bg-[#ededed] text-[#0a0a0a] rounded-lg py-3 text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {creating ? "Creating..." : "+ Create Task"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
