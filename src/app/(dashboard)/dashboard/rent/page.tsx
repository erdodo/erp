"use client";

import { useState, useEffect, useCallback } from "react";
import type { RentalProperty } from "@/lib/ops-types";

const PROP_TYPES = ["office","warehouse","retail","residential","land","other"];
const PROP_LABELS: Record<string,string> = { office:"Ofis", warehouse:"Depo", retail:"Mağaza", residential:"Konut", land:"Arsa", other:"Diğer" };

export default function RentPage() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [modal,      setModal]      = useState<"property" | "contract" | null>(null);
  const [selected,   setSelected]   = useState<RentalProperty | null>(null);
  const [propForm,   setPropForm]   = useState({ name: "", propType: "office", address: "" });
  const [contForm,   setContForm]   = useState({ tenantName: "", amount: 0, currency: "TRY", startDate: "", endDate: "" });
  const [saving,     setSaving]     = useState(false);

  const today = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/rent");
    const d = await r.json() as { properties: RentalProperty[] };
    setProperties(d.properties); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProp() {
    setSaving(true);
    const { propType: pt, ...rest } = propForm;
    await fetch("/api/modules/rent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "property", ...rest, propType: pt }) });
    setSaving(false); setModal(null); await load();
  }

  async function saveCont() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/modules/rent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "contract", propertyId: selected.id, ...contForm }) });
    setSaving(false); setModal(null); await load();
  }

  async function markPaid(paymentId: string) {
    await fetch("/api/modules/rent", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "payment", id: paymentId }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-building text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">Kira Yönetimi</h1><p className="text-xs text-slate-400">Mülk, sözleşme ve ödeme takibi</p></div>
        </div>
        <button onClick={() => { setPropForm({ name:"", propType:"office", address:"" }); setModal("property"); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Mülk Ekle
        </button>
      </div>

      {loading ? <div className="flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
      : properties.length === 0 ? <div className="py-16 text-center text-slate-400"><i className="pi pi-building text-5xl block mb-3 opacity-20" />Henüz mülk yok</div>
      : (
        <div className="space-y-4">
          {properties.map((prop) => (
            <div key={prop.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{prop.name}</p>
                  <p className="text-xs text-slate-400">{PROP_LABELS[prop.type] ?? prop.type} {prop.address ? `· ${prop.address}` : ""}</p>
                </div>
                <button onClick={() => { setSelected(prop); setContForm({ tenantName:"", amount:0, currency:"TRY", startDate:"", endDate:"" }); setModal("contract"); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-slate-50 transition">
                  <i className="pi pi-plus text-xs mr-1" />Sözleşme
                </button>
              </div>
              {prop.contracts && prop.contracts.length > 0 ? prop.contracts.map((c) => (
                <div key={c.id} className="px-5 py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div><p className="font-medium text-foreground text-sm">{c.tenantName}</p>
                      <p className="text-xs text-slate-400">{c.amount.toLocaleString("tr-TR")} {c.currency}/ay · {new Date(c.startDate).toLocaleDateString("tr-TR")} {c.endDate ? `— ${new Date(c.endDate).toLocaleDateString("tr-TR")}` : ""}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.isActive ? "Aktif" : "Pasif"}</span>
                  </div>
                  {c.payments && c.payments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {c.payments.map((pay) => {
                        const isOverdue = pay.status === "pending" && new Date(pay.dueDate) < today;
                        return (
                          <div key={pay.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${pay.status === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : isOverdue ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-slate-50 text-slate-600"}`}>
                            <span>{new Date(pay.dueDate).toLocaleDateString("tr-TR")}</span>
                            <span className="font-medium">{pay.amount.toLocaleString("tr-TR")}</span>
                            {pay.status === "pending" && <button onClick={() => markPaid(pay.id)} className="underline">Öde</button>}
                            {pay.status === "paid" && <i className="pi pi-check text-xs" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )) : <div className="px-5 py-4 text-sm text-slate-400">Henüz sözleşme yok</div>}
            </div>
          ))}
        </div>
      )}

      {modal === "property" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-foreground mb-4">Yeni Mülk</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Mülk Adı *</label><input value={propForm.name} onChange={(e) => setPropForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Tür</label>
                <select value={propForm.propType} onChange={(e) => setPropForm((p) => ({ ...p, propType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  {PROP_TYPES.map((t) => <option key={t} value={t}>{PROP_LABELS[t] ?? t}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Adres</label><input value={propForm.address} onChange={(e) => setPropForm((p) => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={saveProp} disabled={saving || !propForm.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "contract" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-foreground mb-4">Yeni Sözleşme — {selected?.name}</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Kiracı Adı *</label><input value={contForm.tenantName} onChange={(e) => setContForm((p) => ({ ...p, tenantName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Aylık Tutar *</label><input type="number" min="0" value={contForm.amount} onChange={(e) => setContForm((p) => ({ ...p, amount: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Döviz</label>
                  <select value={contForm.currency} onChange={(e) => setContForm((p) => ({ ...p, currency: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {["TRY","USD","EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç *</label><input type="date" value={contForm.startDate} onChange={(e) => setContForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bitiş</label><input type="date" value={contForm.endDate} onChange={(e) => setContForm((p) => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={saveCont} disabled={saving || !contForm.tenantName || !contForm.amount || !contForm.startDate} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
