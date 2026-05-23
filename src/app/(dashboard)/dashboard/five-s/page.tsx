"use client";

import { useState, useEffect, useCallback } from "react";
import { FIVE_S_CATEGORIES, type FiveSAudit, type FiveSKey } from "@/lib/production-types";

const EMPTY = { title: "", location: "", auditor: "", sort: 3, setInOrder: 3, shine: 3, standardize: 3, sustain: 3, notes: "", actions: "", auditDate: "" };

function RadarChart({ values }: { values: Record<FiveSKey, number> }) {
  const keys   = FIVE_S_CATEGORIES.map((c) => c.key) as FiveSKey[];
  const n      = keys.length;
  const cx     = 100; const cy = 100; const r = 70;
  const pts    = (max: number) => keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v     = ((values[k] ?? 0) / max) * r;
    return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)] as [number, number];
  });
  const gridPts = (frac: number) => keys.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `${cx + frac * r * Math.cos(a)},${cy + frac * r * Math.sin(a)}`;
  }).join(" ");
  const valuePts = pts(5).map(([x, y]) => `${x},${y}`).join(" ");
  const axisEnds = keys.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
  const labelPts = keys.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lr = r + 20;
    return [cx + lr * Math.cos(a), cy + lr * Math.sin(a)] as [number, number];
  });

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-60">
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
        <polygon key={f} points={gridPts(f)} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {axisEnds.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      <polygon points={valuePts} fill="#6366f120" stroke="#6366f1" strokeWidth="1.5" />
      {labelPts.map(([x, y], i) => (
        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#64748b">
          {FIVE_S_CATEGORIES[i].label.split(" ")[0]}
        </text>
      ))}
    </svg>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-4">{value}</span>
    </div>
  );
}

export default function FiveSPage() {
  const [audits,  setAudits]  = useState<FiveSAudit[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [avg,     setAvg]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm]= useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async (pg?: number) => {
    setLoading(true);
    const r = await fetch(`/api/modules/five-s?page=${pg ?? page}`);
    const d = await r.json() as { audits: FiveSAudit[]; total: number; pages: number; avgScore: number };
    setAudits(d.audits); setTotal(d.total); setPages(d.pages); setAvg(d.avgScore);
    setLoading(false);
  }, [page]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  function setScore(key: FiveSKey, val: number) { setForm((p) => ({ ...p, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    await fetch("/api/modules/five-s", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, auditDate: form.auditDate || undefined }),
    });
    setSaving(false); setShowForm(false); setForm(EMPTY); await load();
  }

  async function deleteAudit(id: string) {
    if (!confirm("Bu denetimi silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/five-s/${id}`, { method: "DELETE" });
    await load();
  }

  const scoreColor = (s: number) => s >= 4 ? "#10b981" : s >= 3 ? "#f59e0b" : "#ef4444";

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-check-square text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">5S Denetim</h1>
            <p className="text-xs text-slate-400">Sıralama · Düzenleme · Temizlik · Standartlaştırma · Sürdürme</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Denetim
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 col-span-2 sm:col-span-1 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#6366f120" }}>
            <i className="pi pi-list text-xl" style={{ color: "#6366f1" }} />
          </div>
          <div><p className="text-2xl font-bold text-foreground">{total}</p><p className="text-xs text-slate-400">Toplam Denetim</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${scoreColor(avg)}20` }}>
            <i className="pi pi-star text-xl" style={{ color: scoreColor(avg) }} />
          </div>
          <div><p className="text-2xl font-bold text-foreground">{avg.toFixed(1)}</p><p className="text-xs text-slate-400">Ort. Puan</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#10b98120" }}>
            <i className="pi pi-check-circle text-xl" style={{ color: "#10b981" }} />
          </div>
          <div><p className="text-2xl font-bold text-foreground">{audits.filter((a) => a.totalScore >= 4).length}</p><p className="text-xs text-slate-400">İyi Denetim</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ef444420" }}>
            <i className="pi pi-exclamation-triangle text-xl" style={{ color: "#ef4444" }} />
          </div>
          <div><p className="text-2xl font-bold text-foreground">{audits.filter((a) => a.totalScore < 3).length}</p><p className="text-xs text-slate-400">Kritik</p></div>
        </div>
      </div>

      {/* New Audit Form */}
      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5 space-y-5">
          <h2 className="font-semibold text-foreground">Yeni Denetim Kaydı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Aylık 5S Denetimi"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Konum</label>
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Üretim Alanı A"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Denetçi</label>
              <input value={form.auditor} onChange={(e) => setForm((p) => ({ ...p, auditor: e.target.value }))} placeholder="Adı Soyadı"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
          </div>
          {/* 5S Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {FIVE_S_CATEGORIES.map((cat) => (
              <div key={cat.key} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <i className={`pi ${cat.icon} text-xs`} style={{ color: cat.color }} />
                  <span className="text-xs font-medium text-foreground">{cat.label.split("(")[0].trim()}</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((v) => (
                    <button key={v} type="button" onClick={() => setScore(cat.key as FiveSKey, v)}
                      className={`flex-1 h-7 rounded text-xs font-bold transition ${form[cat.key as FiveSKey] >= v ? "text-white" : "bg-slate-100 text-slate-400"}`}
                      style={form[cat.key as FiveSKey] >= v ? { background: cat.color } : {}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Düzeltici Aksiyonlar</label>
              <textarea value={form.actions} onChange={(e) => setForm((p) => ({ ...p, actions: e.target.value }))} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button type="submit" disabled={saving || !form.title} className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : "Denetimi Kaydet"}
            </button>
          </div>
        </form>
      )}

      {/* Audit Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
      ) : audits.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 py-16 text-center text-slate-400">
          <i className="pi pi-check-square text-4xl block mb-2 opacity-30" />Henüz denetim kaydı yok
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {audits.map((audit) => {
            const vals = { sort: audit.sort, setInOrder: audit.setInOrder, shine: audit.shine, standardize: audit.standardize, sustain: audit.sustain };
            const sc   = audit.totalScore;
            return (
              <div key={audit.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{audit.title}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-0.5">
                      {audit.location && <span><i className="pi pi-map-marker text-xs mr-0.5" />{audit.location}</span>}
                      {audit.auditor  && <span><i className="pi pi-user text-xs mr-0.5" />{audit.auditor}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(audit.auditDate).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: scoreColor(sc) }}>{sc.toFixed(1)}</div>
                      <div className="text-xs text-slate-400">/ 5.0</div>
                    </div>
                    <button onClick={() => deleteAudit(audit.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition">
                      <i className="pi pi-trash text-xs" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <RadarChart values={vals} />
                  <div className="flex-1 space-y-2 mt-1">
                    {FIVE_S_CATEGORIES.map((cat) => (
                      <div key={cat.key}>
                        <p className="text-xs text-slate-400 mb-0.5">{cat.label.split("(")[0].trim()}</p>
                        <ScoreBar value={audit[cat.key as FiveSKey] as number} color={cat.color} />
                      </div>
                    ))}
                  </div>
                </div>

                {audit.actions && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-slate-500 mb-1">Aksiyonlar</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{audit.actions}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button onClick={() => { setPage(page-1); void load(page-1); }} disabled={page<=1} className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
          <span className="text-slate-500">{page} / {pages}</span>
          <button onClick={() => { setPage(page+1); void load(page+1); }} disabled={page>=pages} className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
        </div>
      )}
    </div>
  );
}
