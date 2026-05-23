"use client";

import { useState, useEffect, useCallback } from "react";
import { TASK_STATUSES, TASK_PRIORITIES, getTaskStatus, getTaskPriority, type Task, type Project } from "@/lib/project-types";

const EMPTY = { title: "", description: "", status: "todo", priority: "medium", projectId: "", dueDate: "", estimatedHours: 0 };

export default function TasksPage() {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, pr] = await Promise.all([
      fetch("/api/modules/tasks"),
      fetch("/api/modules/projects"),
    ]);
    const td = await tr.json() as { tasks: Task[] };
    const pd = await pr.json() as { projects: Project[] };
    setTasks(td.tasks); setProjects(pd.projects); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, projectId: form.projectId||undefined, dueDate: form.dueDate||undefined, estimatedHours: form.estimatedHours||undefined }) });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function moveTask(id: string, status: string) {
    await fetch("/api/modules/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Görevi silmek istiyor musunuz?")) return;
    await fetch("/api/modules/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const getColumnTasks = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-check-square text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">Görev Yönetimi</h1>
            <p className="text-xs text-slate-400">Kanban panosu — {tasks.length} görev</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Görev
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-64">
          {TASK_STATUSES.map((col) => {
            const colTasks = getColumnTasks(col.id);
            return (
              <div key={col.id} className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/30 flex flex-col">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${col.bg}`}>
                    <i className={`pi ${col.icon} text-xs`} />{col.label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{colTasks.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh]">
                  {colTasks.map((t) => {
                    const pr = getTaskPriority(t.priority);
                    return (
                      <div key={t.id} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-3 hover:shadow-sm transition">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
                          <button onClick={() => deleteTask(t.id)} className="w-5 h-5 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 transition"><i className="pi pi-times text-xs" /></button>
                        </div>
                        {t.project && <p className="text-xs text-slate-400 mb-2">{t.project.name}</p>}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pr.bg}`}>{pr.label}</span>
                          <div className="flex gap-1">
                            {TASK_STATUSES.filter((s) => s.id !== col.id).slice(0,2).map((next) => (
                              <button key={next.id} onClick={() => moveTask(t.id, next.id)}
                                className="text-xs text-slate-400 hover:text-foreground px-1 py-0.5 rounded hover:bg-slate-100 transition" title={next.label}>
                                <i className={`pi ${next.icon} text-xs`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">Görev yok</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Yeni Görev</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Öncelik</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Proje</label>
                  <select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bitiş Tarihi</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tahmini Saat</label>
                  <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(e) => setForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.title} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
