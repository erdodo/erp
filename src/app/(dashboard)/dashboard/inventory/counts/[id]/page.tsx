"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCountStatus, COUNT_STATUSES, type InventoryCount, type InventoryCountItem, type InventoryItem } from "@/lib/inventory-types";

interface FullCount extends InventoryCount { items: (InventoryCountItem & { item: InventoryItem })[]; }

export default function CountDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [count,    setCount]    = useState<FullCount | null>(null);
  const [invItems, setInvItems] = useState<InventoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [addItemId, setAddItemId] = useState("");
  const [actuals,   setActuals]   = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [cr, ir] = await Promise.all([
      fetch(`/api/modules/inventory/counts/${id}`),
      fetch("/api/modules/inventory/items?limit=200"),
    ]);
    if (cr.ok) setCount(await cr.json() as FullCount);
    const id2 = await ir.json() as { items: InventoryItem[] };
    setInvItems(id2.items);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    await fetch(`/api/modules/inventory/counts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setSaving(false); await load();
  }

  async function addItem() {
    if (!addItemId) return;
    const inv = invItems.find((i) => i.id === addItemId);
    await fetch(`/api/modules/inventory/counts/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: addItemId, expected: inv?.quantity ?? 0 }),
    });
    setAddItemId(""); await load();
  }

  async function saveActual(ciId: string) {
    const val = parseFloat(actuals[ciId] ?? "0");
    await fetch(`/api/modules/inventory/counts/${id}/items`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ciId, actual: val }),
    });
    await load();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>;
  if (!count)  return <div className="text-center py-20 text-slate-400">Sayım bulunamadı <button onClick={() => router.back()} className="underline" style={{ color: "var(--color-primary)" }}>← Geri</button></div>;

  const st     = getCountStatus(count.status);
  const nextSts= COUNT_STATUSES.find((s) => s.id === count.status)?.next ?? [];
  const canEdit= ["draft", "in_progress"].includes(count.status);
  const mainFlow = COUNT_STATUSES;
  const curIdx = mainFlow.findIndex((s) => s.id === count.status);

  const diffItems = count.items.filter((ci) => ci.actual !== null && ci.difference !== null && ci.difference !== 0);

  return (
    <div className="max-w-4xl pb-8 mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-foreground">{count.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${st.bg}`}>
                <i className={`pi ${st.icon} text-xs`} />{st.label}
              </span>
            </div>
            <p className="text-sm text-slate-400">{count.items.length} öğe · {new Date(count.createdAt).toLocaleDateString("tr-TR")}</p>
          </div>
        </div>
        {/* Timeline */}
        <div className="mt-5 pt-4 border-t border-border overflow-x-auto">
          <div className="flex items-center min-w-max">
            {mainFlow.map((s, i) => {
              const done = i <= curIdx; const current = s.id === count.status;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1 px-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                      style={done ? { background: "#6366f1", color: "#fff" } : { background: "#f1f5f9", color: "#94a3b8" }}>
                      {i < curIdx ? <i className="pi pi-check text-xs" /> : <i className={`pi ${s.icon} text-xs`} />}
                    </div>
                    <span className={`text-xs whitespace-nowrap ${current ? "font-semibold text-foreground" : "text-slate-400"}`}>{s.label}</span>
                  </div>
                  {i < mainFlow.length - 1 && <div className={`h-0.5 w-8 ${i < curIdx ? "bg-indigo-400" : "bg-slate-200"}`} />}
                </div>
              );
            })}
          </div>
        </div>
        {nextSts.length > 0 && (
          <div className="mt-4 flex gap-2">
            {nextSts.map((ns) => {
              const cfg = getCountStatus(ns);
              return (
                <button key={ns} onClick={() => changeStatus(ns)} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50 text-white"
                  style={{ background: ns === "approved" ? "#10b981" : "#6366f1" }}>
                  <i className={`pi ${cfg.icon} text-xs`} />{cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Item */}
      {canEdit && (
        <div className="flex gap-3">
          <select value={addItemId} onChange={(e) => setAddItemId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer focus:outline-none">
            <option value="">— Öğe seç —</option>
            {invItems.filter((i) => !count.items.find((ci) => ci.itemId === i.id)).map((i) => (
              <option key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ""}</option>
            ))}
          </select>
          <button onClick={addItem} disabled={!addItemId} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus text-xs mr-1" /> Ekle
          </button>
        </div>
      )}

      {/* Count Items Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Sayım Listesi</h2>
          {diffItems.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {diffItems.length} fark var
            </span>
          )}
        </div>
        {count.items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Henüz öğe eklenmedi</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Öğe</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Beklenen</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Sayılan</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Fark</th>
                {canEdit && <th className="py-3 px-4 w-28" />}
              </tr>
            </thead>
            <tbody>
              {count.items.map((ci) => {
                const hasDiff = ci.actual !== null && ci.difference !== null && ci.difference !== 0;
                return (
                  <tr key={ci.id} className={`border-b border-border/50 ${hasDiff ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                    <td className="py-3 px-5 font-medium text-foreground">{ci.item?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{ci.expected}</td>
                    <td className="py-3 px-4 text-right">
                      {canEdit ? (
                        <input type="number" min="0" step="0.01"
                          value={actuals[ci.id] ?? (ci.actual !== null ? String(ci.actual) : "")}
                          onChange={(e) => setActuals((p) => ({ ...p, [ci.id]: e.target.value }))}
                          placeholder="—"
                          className="w-24 px-2 py-1 rounded border border-border text-right text-sm text-foreground focus:outline-none" />
                      ) : (
                        <span className="text-foreground">{ci.actual !== null ? ci.actual : "—"}</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${hasDiff ? (ci.difference! > 0 ? "text-emerald-600" : "text-red-600") : "text-slate-400"}`}>
                      {ci.difference !== null ? (ci.difference > 0 ? `+${ci.difference}` : String(ci.difference)) : "—"}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4">
                        <button onClick={() => saveActual(ci.id)}
                          disabled={!actuals[ci.id]}
                          className="w-full px-2 py-1 rounded text-xs font-medium text-white disabled:opacity-40"
                          style={{ background: "var(--color-primary)" }}>
                          Kaydet
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
