"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  timezone: string;
  isActive: boolean;
}

export function TenantEditForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tenant.name,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    currency: tenant.currency,
    timezone: tenant.timezone,
    isActive: tenant.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const r = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setMsg("Kaydedildi ✓"); router.refresh(); }
    else setMsg("Hata oluştu");
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-5 space-y-4">
      <h2 className="font-semibold text-foreground text-sm">Tenant Ayarları</h2>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">Şirket Adı</label>
        <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Birincil Renk</label>
          <div className="flex gap-2">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="w-8 h-8 rounded border border-border cursor-pointer" />
            <input type="text" value={form.primaryColor} onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="flex-1 px-2 py-1 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-xs font-mono focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">İkincil Renk</label>
          <div className="flex gap-2">
            <input type="color" value={form.secondaryColor} onChange={(e) => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
              className="w-8 h-8 rounded border border-border cursor-pointer" />
            <input type="text" value={form.secondaryColor} onChange={(e) => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
              className="flex-1 px-2 py-1 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-xs font-mono focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Para Birimi</label>
          <select value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
            {["TRY", "USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Durum</label>
          <select value={form.isActive ? "1" : "0"} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.value === "1" }))}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </select>
        </div>
      </div>

      {msg && <p className={`text-xs px-3 py-1.5 rounded ${msg.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg}</p>}

      <button type="submit" disabled={saving} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
        {saving ? <><i className="pi pi-spin pi-spinner mr-1" />Kaydediliyor...</> : "Kaydet"}
      </button>
    </form>
  );
}
