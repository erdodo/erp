"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCountStatus, COUNT_STATUSES, type InventoryCount } from "@/lib/inventory-types";

export default function CountsPage() {
  const [counts,  setCounts]  = useState<InventoryCount[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState({ name: "", notes: "" });
  const [showNew, setShowNew] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async (pg?: number) => {
    setLoading(true);
    const r = await fetch(`/api/modules/inventory/counts?page=${pg ?? page}`);
    const d = await r.json() as { counts: InventoryCount[]; total: number; pages: number };
    setCounts(d.counts); setTotal(d.total); setPages(d.pages); setLoading(false);
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/modules/inventory/counts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setShowNew(false); setForm({ name: "", notes: "" }); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/modules/inventory/counts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <div className="pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} sayım oturumu</p>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Sayım
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">Yeni Sayım Oturumu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Sayım Adı *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Mayıs 2025 Envanteri"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button onClick={create} disabled={saving || !form.name} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-12"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>
        ) : counts.length === 0 ? (
          <div className="col-span-3 rounded-2xl border border-border bg-white dark:bg-slate-900 py-16 text-center text-slate-400">
            <i className="pi pi-list-check text-4xl block mb-2 opacity-30" />Henüz sayım oturumu yok
          </div>
        ) : counts.map((count) => {
          const st = getCountStatus(count.status);
          const nextSts = COUNT_STATUSES.find((s) => s.id === count.status)?.next ?? [];
          return (
            <div key={count.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{count.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(count.createdAt).toLocaleDateString("tr-TR")} · {count._count?.items ?? 0} öğe</p>
                </div>
                <span className={`ml-2 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                  <i className={`pi ${st.icon} text-xs`} />{st.label}
                </span>
              </div>
              {count.notes && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{count.notes}</p>}
              <div className="flex items-center gap-2 mt-3">
                <Link href={`/dashboard/inventory/counts/${count.id}`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-center hover:bg-slate-50 transition text-foreground">
                  <i className="pi pi-eye text-xs mr-1" /> Detay
                </Link>
                {nextSts.map((ns) => {
                  const nsCfg = getCountStatus(ns);
                  return (
                    <button key={ns} onClick={() => changeStatus(count.id, ns)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition text-white`}
                      style={{ background: ns === "approved" ? "#10b981" : ns === "in_progress" ? "#f59e0b" : "#6366f1" }}>
                      {nsCfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
