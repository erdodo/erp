"use client";

import { useState, useEffect } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  timezone: string;
  language: string;
}

const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF"];
const TIMEZONES = ["Europe/Istanbul", "UTC", "Europe/London", "Europe/Berlin", "America/New_York"];
const LANGUAGES = [{ value: "tr", label: "Türkçe" }, { value: "en", label: "English" }];

export default function AdminSettingsPage() {
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [form, setForm] = useState<Partial<TenantSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setTenant(d.tenant); setForm(d.tenant ?? {}); setLoading(false); });
  }, []);

  function set(field: keyof TenantSettings, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "primaryColor" || field === "secondaryColor") {
      document.documentElement.style.setProperty(
        field === "primaryColor" ? "--color-primary" : "--color-secondary",
        value
      );
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        currency: form.currency,
        timezone: form.timezone,
        language: form.language,
      }),
    });
    if (r.ok) setMsg("Ayarlar kaydedildi ✓");
    else setMsg("Hata oluştu");
    setSaving(false);
  }

  if (loading) return <div className="text-center py-16 text-slate-400"><i className="pi pi-spin pi-spinner text-2xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <i className="pi pi-cog" style={{ color: "var(--color-primary)" }} /> Şirket Ayarları
          <span className="text-sm font-normal text-slate-400 ml-1">{tenant?.slug}</span>
        </h1>
        <AdminNav />
      </div>

      <form onSubmit={save} className="space-y-5">
        {/* General */}
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm border-b border-border pb-3">Genel Bilgiler</h2>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Şirket Adı</label>
            <input type="text" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Para Birimi</label>
              <select value={form.currency ?? "TRY"} onChange={(e) => set("currency", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Saat Dilimi</label>
              <select value={form.timezone ?? "Europe/Istanbul"} onChange={(e) => set("timezone", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Dil</label>
              <select value={form.language ?? "tr"} onChange={(e) => set("language", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm border-b border-border pb-3">Marka Renkleri</h2>
          <div className="grid grid-cols-2 gap-6">
            {(["primaryColor", "secondaryColor"] as const).map((field) => (
              <div key={field}>
                <label className="text-xs text-slate-500 mb-2 block">
                  {field === "primaryColor" ? "Birincil Renk" : "İkincil Renk"}
                </label>
                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <input type="color" value={form[field] ?? "#2563eb"} onChange={(e) => set(field, e.target.value)}
                      className="w-12 h-12 rounded-xl border border-border cursor-pointer p-1" />
                  </div>
                  <div className="flex-1">
                    <input type="text" value={form[field] ?? ""} onChange={(e) => set(field, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm font-mono focus:outline-none" />
                    <div className="mt-2 h-6 rounded" style={{ background: form[field] ?? "#2563eb" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Live preview */}
          <div className="mt-2 p-4 rounded-lg border border-border bg-slate-50 dark:bg-slate-800 space-y-2">
            <p className="text-xs text-slate-500 mb-2">Canlı Önizleme</p>
            <div className="flex gap-2">
              <button type="button" className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: form.primaryColor ?? "#2563eb" }}>Birincil Buton</button>
              <button type="button" className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: form.secondaryColor ?? "#7c3aed" }}>İkincil Buton</button>
              <span className="px-3 py-2 rounded-lg text-sm" style={{ background: (form.primaryColor ?? "#2563eb") + "20", color: form.primaryColor ?? "#2563eb" }}>Badge</span>
            </div>
          </div>
        </div>

        {msg && <p className={`text-sm px-4 py-2.5 rounded-lg ${msg.includes("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg}</p>}

        <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2" style={{ background: "var(--color-primary)" }}>
          {saving ? <><i className="pi pi-spin pi-spinner" /> Kaydediliyor...</> : <><i className="pi pi-check" /> Kaydet</>}
        </button>
      </form>
    </div>
  );
}
