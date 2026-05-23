"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CHECK_TYPES, CHECK_RESULTS, getCheckType, getCheckResult, type QualityCheck, type QualityStandard } from "@/lib/quality-types";

type CheckResult = "pending" | "pass" | "fail" | "conditional";

const EMPTY = { type: "incoming", productName: "", batchNo: "", quantity: 1, defectCount: 0, result: "pending" as CheckResult, standardId: "", inspector: "", notes: "", checkedAt: "" };

interface Stats { total: number; avgPpm: number; overallPpm: number; passRate: number }

export default function QualityPage() {
  const [checks,    setChecks]    = useState<QualityCheck[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState("");
  const [typeF,     setTypeF]     = useState("");
  const [resultF,   setResultF]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; t?: string; r?: string }) => {
    setLoading(true);
    const p = opts?.pg ?? page;
    const q = opts?.s  ?? search;
    const t = opts?.t  ?? typeF;
    const r = opts?.r  ?? resultF;
    const params = new URLSearchParams({ page: String(p), search: q, type: t, result: r });
    const [cr, sr, standr] = await Promise.all([
      fetch(`/api/modules/quality/checks?${params}`),
      fetch("/api/modules/quality/stats"),
      fetch("/api/modules/quality/standards"),
    ]);
    const cd = await cr.json() as { checks: QualityCheck[]; total: number; pages: number };
    const sd = await sr.json() as Stats;
    const std = await standr.json() as { standards: QualityStandard[] };
    setChecks(cd.checks); setTotal(cd.total); setPages(cd.pages); setStats(sd); setStandards(std.standards);
    setLoading(false);
  }, [page, search, typeF, resultF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setModal(false);
    }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/modules/quality/checks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, standardId: form.standardId || undefined, checkedAt: form.checkedAt || undefined }),
    });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function updateResult(id: string, result: string) {
    await fetch(`/api/modules/quality/checks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result }) });
    await load();
  }

  async function deleteCheck(id: string) {
    if (!confirm("Silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/quality/checks/${id}`, { method: "DELETE" });
    await load();
  }

  const ppmColor = (ppm: number) => ppm === 0 ? "#10b981" : ppm < 500 ? "#f59e0b" : "#ef4444";

  return (
    <div className="pb-8 space-y-4">
      {/* KPI Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam Kontrol", value: String(stats.total), icon: "pi-list",       color: "#6366f1" },
            { label: "Geçme Oranı",   value: `${stats.passRate.toFixed(1)}%`, icon: "pi-check-circle", color: "#10b981" },
            { label: "Ort. PPM",      value: stats.avgPpm.toFixed(0),    icon: "pi-chart-bar",   color: ppmColor(stats.avgPpm) },
            { label: "Genel PPM",     value: stats.overallPpm.toFixed(0),icon: "pi-chart-line",  color: ppmColor(stats.overallPpm) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: `${kpi.color}20` }}>
                <i className={`pi ${kpi.icon} text-lg`} style={{ color: kpi.color }} />
              </div>
              <div><p className="text-2xl font-bold text-foreground">{kpi.value}</p><p className="text-xs text-slate-400">{kpi.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); void load({ pg:1, t: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
          <option value="">Tüm Tipler</option>
          {CHECK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={resultF} onChange={(e) => { setResultF(e.target.value); setPage(1); void load({ pg:1, r: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
          <option value="">Tüm Sonuçlar</option>
          {CHECK_RESULTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Kontrol Ekle
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Tip</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Miktar</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Hata</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">PPM</th>
                <th className="py-3 px-4 font-medium text-slate-500">Sonuç</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden md:table-cell">Tarih</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {checks.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-verified text-4xl block mb-2 opacity-30" />
                  {search || typeF || resultF ? "Filtreye uyan kayıt yok" : "Henüz kontrol kaydı yok"}
                </td></tr>
              ) : checks.map((c) => {
                const ct = getCheckType(c.type);
                const cr = getCheckResult(c.result);
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5">
                      <p className="font-medium text-foreground">{c.productName}</p>
                      {c.batchNo && <p className="text-xs text-slate-400 font-mono">{c.batchNo}</p>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ct.bg}`}>
                        <i className={`pi ${ct.icon} text-xs`} />{ct.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">{c.quantity.toLocaleString("tr-TR")}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{c.defectCount}</td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: ppmColor(c.ppm) }}>{c.ppm.toFixed(0)}</td>
                    <td className="py-3 px-4">
                      <select value={c.result} onChange={(e) => updateResult(c.id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${cr.bg}`}
                        onClick={(e) => e.stopPropagation()}>
                        {CHECK_RESULTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{new Date(c.checkedAt).toLocaleDateString("tr-TR")}</td>
                    <td className="py-3 px-2">
                      <button onClick={() => deleteCheck(c.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition">
                        <i className="pi pi-trash text-xs" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} kayıt</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Kalite Kontrol Kaydı</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Ürün Adı *</label>
                <input value={form.productName} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Kontrol Tipi</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  {CHECK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Standart</label>
                <select value={form.standardId} onChange={(e) => setForm((p) => ({ ...p, standardId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  <option value="">— Seçin —</option>
                  {standards.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Parti No</label>
                <input value={form.batchNo} onChange={(e) => setForm((p) => ({ ...p, batchNo: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Kontrol Tarihi</label>
                <input type="date" value={form.checkedAt} onChange={(e) => setForm((p) => ({ ...p, checkedAt: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Miktar *</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Hatalı Adet</label>
                <input type="number" min="0" value={form.defectCount} onChange={(e) => setForm((p) => ({ ...p, defectCount: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
              <div className="col-span-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-400">Hesaplanan PPM: </span>
                <strong style={{ color: ppmColor(form.quantity > 0 ? (form.defectCount / form.quantity) * 1e6 : 0) }}>
                  {form.quantity > 0 ? ((form.defectCount / form.quantity) * 1e6).toFixed(0) : "—"}
                </strong>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Sonuç</label>
                <select value={form.result} onChange={(e) => setForm((p) => ({ ...p, result: e.target.value as CheckResult }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  {CHECK_RESULTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Denetçi</label>
                <input value={form.inspector} onChange={(e) => setForm((p) => ({ ...p, inspector: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.productName} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
