"use client";

import { useState, useEffect, useCallback } from "react";
import { APP_STATUSES, getAppStatus, type JobPosting, type JobApplication } from "@/lib/hr-types";

const POSTING_EMPTY = { title: "", departmentId: "", description: "", requirements: "" };
const APP_EMPTY     = { name: "", email: "", phone: "", notes: "" };

export default function RecruitmentPage() {
  const [postings,     setPostings]     = useState<JobPosting[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selected,     setSelected]     = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appLoading,   setAppLoading]   = useState(false);
  const [modal,        setModal]        = useState<"posting" | "app" | null>(null);
  const [postForm,     setPostForm]     = useState(POSTING_EMPTY);
  const [appForm,      setAppForm]      = useState(APP_EMPTY);
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/hr/recruitment");
    const d = await r.json() as { postings: JobPosting[] };
    setPostings(d.postings); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadApps(posting: JobPosting) {
    setSelected(posting); setAppLoading(true);
    const r = await fetch(`/api/modules/hr/recruitment/${posting.id}/applications`);
    const d = await r.json() as { applications: JobApplication[] };
    setApplications(d.applications); setAppLoading(false);
  }

  async function savePosting() {
    setSaving(true);
    await fetch("/api/modules/hr/recruitment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(postForm) });
    setSaving(false); setModal(null); setPostForm(POSTING_EMPTY); await load();
  }

  async function saveApp() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/modules/hr/recruitment/${selected.id}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(appForm) });
    setSaving(false); setModal(null); setAppForm(APP_EMPTY); await loadApps(selected);
  }

  async function changeAppStatus(appId: string, status: string) {
    await fetch(`/api/modules/hr/recruitment/${selected?.id}/applications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appId, status }) });
    if (selected) await loadApps(selected);
  }

  async function togglePostingStatus(p: JobPosting) {
    await fetch("/api/modules/hr/recruitment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: p.status === "open" ? "closed" : "open" }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-briefcase text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">İşe Alım</h1>
            <p className="text-xs text-slate-400">İlanlar, başvurular ve mülakat takibi</p></div>
        </div>
        <button onClick={() => { setPostForm(POSTING_EMPTY); setModal("posting"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni İlan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Postings */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">İş İlanları</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>
          ) : postings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm"><i className="pi pi-briefcase text-3xl block mb-2 opacity-30" />İlan yok</div>
          ) : postings.map((p) => (
            <div key={p.id} onClick={() => loadApps(p)}
              className={`px-4 py-3 border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition ${selected?.id === p.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground text-sm">{p.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p._count?.applications ?? 0} başvuru</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${p.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.status === "open" ? "Açık" : "Kapalı"}</span>
                  <button onClick={(e) => { e.stopPropagation(); togglePostingStatus(p); }} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-foreground"><i className="pi pi-ellipsis-v text-xs" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Applications */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm">{selected ? `${selected.title} — Başvurular` : "Bir ilan seçin"}</h2>
            {selected && (
              <button onClick={() => { setAppForm(APP_EMPTY); setModal("app"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: "var(--color-primary)" }}>
                <i className="pi pi-plus text-xs" /> Başvuru
              </button>
            )}
          </div>
          {!selected ? (
            <div className="py-16 text-center text-slate-400 text-sm"><i className="pi pi-arrow-left text-3xl block mb-2 opacity-30" />Soldaki ilanlardan birini seçin</div>
          ) : appLoading ? (
            <div className="flex items-center justify-center py-8"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm"><i className="pi pi-inbox text-3xl block mb-2 opacity-30" />Başvuru yok</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-4 text-left font-medium text-slate-500">Aday</th>
                    <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">E-posta</th>
                    <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                    <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const as_ = getAppStatus(app.status);
                    return (
                      <tr key={app.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <p className="font-medium text-foreground">{app.name}</p>
                          {app.phone && <p className="text-xs text-slate-400">{app.phone}</p>}
                        </td>
                        <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{app.email}</td>
                        <td className="py-3 px-4">
                          <select value={app.status} onChange={(e) => changeAppStatus(app.id, e.target.value)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${as_.bg}`}>
                            {APP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{new Date(app.appliedAt).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Posting Modal */}
      {modal === "posting" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-foreground mb-4">Yeni İş İlanı</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label>
                <input value={postForm.title} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <textarea value={postForm.description} onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Aranan Nitelikler</label>
                <textarea value={postForm.requirements} onChange={(e) => setPostForm((p) => ({ ...p, requirements: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={savePosting} disabled={saving || !postForm.title} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Yayınla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Modal */}
      {modal === "app" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-foreground mb-4">Başvuru Ekle</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad *</label>
                <input value={appForm.name} onChange={(e) => setAppForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">E-posta *</label>
                <input type="email" value={appForm.email} onChange={(e) => setAppForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                <input value={appForm.phone} onChange={(e) => setAppForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={saveApp} disabled={saving || !appForm.name || !appForm.email} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
