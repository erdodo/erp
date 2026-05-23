"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: string; name: string; keyPrefix: string; isActive: boolean;
  expiresAt: string | null; createdAt: string; lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const [keys,    setKeys]    = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ name: "", expiresAt: "" });
  const [saving,  setSaving]  = useState(false);
  const [newRaw,  setNewRaw]  = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/api-keys");
    const d = await r.json() as { keys: ApiKey[] };
    setKeys(d.keys); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setSaving(true);
    const r = await fetch("/api/modules/api-keys", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, expiresAt: form.expiresAt||undefined }) });
    const d = await r.json() as { rawKey: string };
    setSaving(false); setModal(false); setNewRaw(d.rawKey); setForm({ name:"", expiresAt:"" }); await load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/modules/api-keys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("API anahtarını iptal etmek istiyor musunuz?")) return;
    await fetch("/api/modules/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const isExpired = (d: string | null) => d && new Date(d) < new Date();

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-key text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">API Anahtarları</h1><p className="text-xs text-slate-400">Güvenli entegrasyon tokenları</p></div>
        </div>
        <button onClick={() => { setForm({ name:"", expiresAt:"" }); setModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Anahtar
        </button>
      </div>

      {newRaw && (
        <div className="px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <p className="text-sm font-semibold text-amber-800"><i className="pi pi-exclamation-triangle mr-2" />Bu anahtar yalnızca bir kez gösterilecek — şimdi kopyalayın!</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-mono text-slate-700 break-all">{newRaw}</code>
            <button onClick={() => copy(newRaw)} className="px-3 py-2 rounded-lg bg-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-300 shrink-0">
              {copied ? <i className="pi pi-check" /> : <i className="pi pi-copy" />}
            </button>
          </div>
          <button onClick={() => setNewRaw(null)} className="text-xs text-amber-600 underline">Anladım, kapat</button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
              <th className="py-3 px-5 text-left font-medium text-slate-500">Ad</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500">Prefix</th>
              <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Son Kullanım</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Bitiş</th>
              <th className="py-3 px-2 w-24" />
            </tr></thead>
            <tbody>
              {keys.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-slate-400"><i className="pi pi-key text-4xl block mb-2 opacity-30" />API anahtarı yok</td></tr>
              : keys.map((k) => (
                <tr key={k.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-5 font-medium text-foreground">{k.name}</td>
                  <td className="py-3 px-4"><code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">{k.keyPrefix}…</code></td>
                  <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${k.isActive && !isExpired(k.expiresAt) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{k.isActive && !isExpired(k.expiresAt) ? "Aktif" : isExpired(k.expiresAt) ? "Süresi Doldu" : "Pasif"}</span></td>
                  <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("tr-TR") : "Hiç"}</td>
                  <td className="py-3 px-4 hidden lg:table-cell"><span className={`text-xs ${isExpired(k.expiresAt) ? "text-red-500 font-medium" : "text-slate-400"}`}>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("tr-TR") : "Süresiz"}</span></td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => toggle(k.id, k.isActive)} className="px-2 py-1 rounded-lg text-xs border border-border text-slate-500 hover:bg-slate-50">{k.isActive ? "Devre Dışı" : "Aktifleştir"}</button>
                      <button onClick={() => del(k.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500"><i className="pi pi-trash text-xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">Yeni API Anahtarı</h2><button onClick={() => setModal(false)} className="text-slate-400"><i className="pi pi-times" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">İsim *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ör: Mobil Uygulama" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Bitiş Tarihi (opsiyonel)</label><input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={create} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
