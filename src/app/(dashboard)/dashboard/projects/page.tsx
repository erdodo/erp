"use client";

import { useState, useEffect, useCallback } from "react";
import { PROJECT_STATUSES, TASK_STATUSES, getProjectStatus, type Project } from "@/lib/project-types";

const EMPTY = { name: "", description: "", budget: 0, currency: "TRY", startDate: "", endDate: "" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [statusF,  setStatusF]  = useState("");
  const [drawer,   setDrawer]   = useState<"new" | Project | null>(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async (st?: string) => {
    setLoading(true);
    const r = await fetch(`/api/modules/projects?status=${st ?? statusF}`);
    const d = await r.json() as { projects: Project[]; total: number };
    setProjects(d.projects); setLoading(false);
  }, [statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(p: Project) {
    setForm({ name: p.name, description: p.description ?? "", budget: p.budget ?? 0, currency: p.currency, startDate: p.startDate ? p.startDate.slice(0,10) : "", endDate: p.endDate ? p.endDate.slice(0,10) : "" });
    setDrawer(p);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, startDate: form.startDate||undefined, endDate: form.endDate||undefined };
    if (typeof drawer === "string") {
      await fetch("/api/modules/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (drawer !== null) {
      await fetch("/api/modules/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, ...payload }) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  async function deleteProject(id: string) {
    if (!confirm("Projeyi silmek istiyor musunuz?")) return;
    await fetch("/api/modules/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-briefcase text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">Proje Yönetimi</h1>
            <p className="text-xs text-slate-400">Bütçe, ilerleme ve kilometre taşları</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Proje
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tümü" }, ...PROJECT_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
          <button key={opt.value} onClick={() => { setStatusF(opt.value); void load(opt.value); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${statusF === opt.value ? "border-primary text-primary" : "border-border text-slate-500 hover:border-slate-400"}`}
            style={statusF === opt.value ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center text-slate-400"><i className="pi pi-briefcase text-5xl block mb-3 opacity-20" />Proje bulunamadı</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const st = getProjectStatus(p.status);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 hover:shadow-md transition cursor-pointer"
                onClick={(e) => { if ((e.target as HTMLElement).closest("button,select")) return; openEdit(p); }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <select value={p.status} onClick={(e) => e.stopPropagation()} onChange={(e) => changeStatus(p.id, e.target.value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${st.bg} shrink-0`}>
                    {PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                {p.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{p.description}</p>}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>İlerleme</span><span>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: "var(--color-primary)" }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span><i className="pi pi-check-square mr-1" />{p._count?.tasks ?? 0} görev</span>
                  {p.budget && <span>{p.budget.toLocaleString("tr-TR")} {p.currency}</span>}
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Proje" : "Projeyi Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Proje Adı *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bütçe</label>
                  <input type="number" min="0" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Para Birimi</label>
                  <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {["TRY","USD","EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bitiş</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              {typeof drawer !== "string" && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">İlerleme ({drawer.progress}%)</label>
                  <input type="range" min="0" max="100" value={drawer.progress}
                    onChange={(e) => fetch("/api/modules/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, progress: Number(e.target.value) }) }).then(() => load())}
                    className="w-full" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                  {saving ? <i className="pi pi-spin pi-spinner" /> : typeof drawer === "string" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
