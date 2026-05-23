"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, CUSTOMER_TYPES } from "@/lib/crm-types";
import PhoneInput from "@/components/ui/PhoneInput";

const COUNTRIES = ["TR", "DE", "GB", "US", "FR", "NL", "BE", "AT", "CH", "AE", "SA", "AZ", "UZ", "KZ"];

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [form, setForm]     = useState({
    type:          "corporate",
    name:          "",
    email:         "",
    phone:         "",
    address:       "",
    city:          "",
    country:       "TR",
    taxNumber:     "",
    taxOffice:     "",
    website:       "",
    pipelineStage: "lead",
    tags:          "",
    notes:         "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Müşteri adı zorunludur."); return; }
    setSaving(true); setError("");
    const r = await fetch("/api/modules/crm/customers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) {
      const data = await r.json() as { id: string };
      router.push(`/dashboard/crm/customers/${data.id}`);
    } else {
      setError("Kayıt sırasında hata oluştu."); setSaving(false);
    }
  }

  const isCorporate = form.type === "corporate";

  return (
    <div className="pb-8 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type toggle */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Müşteri Türü</h2>
          <div className="grid grid-cols-2 gap-3">
            {CUSTOMER_TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => set("type", t.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  form.type === t.id ? "border-primary" : "border-border hover:border-slate-300"
                }`}
                style={form.type === t.id ? { borderColor: "var(--color-primary)" } : {}}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: form.type === t.id ? "var(--color-primary)" : "#e2e8f0" }}>
                  <i className={`pi ${t.icon} text-sm ${form.type === t.id ? "text-white" : "text-slate-500"}`} />
                </div>
                <span className="font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Temel Bilgiler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {isCorporate ? "Firma Adı" : "Ad Soyad"} *
              </label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none focus:ring-2"
                placeholder={isCorporate ? "Örn: Acme Ltd. Şti." : "Örn: Ahmet Yılmaz"} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">E-posta</label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email"
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
              <PhoneInput value={form.phone} onChange={(v) => set("phone", v)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
            </div>
            {isCorporate && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vergi No</label>
                  <input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vergi Dairesi</label>
                  <input value={form.taxOffice} onChange={(e) => set("taxOffice", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Web Sitesi</label>
                  <input value={form.website} onChange={(e) => set("website", e.target.value)} type="url"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
                    placeholder="https://..." />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Adres</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Adres</label>
              <textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Şehir</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ülke</label>
              <select value={form.country} onChange={(e) => set("country", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CRM */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">CRM Bilgileri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Pipeline Aşaması</label>
              <select value={form.pipelineStage} onChange={(e) => set("pipelineStage", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                {PIPELINE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Etiketler (virgülle ayır)</label>
              <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
                placeholder="vip, teknoloji, ihracat"
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none resize-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <i className="pi pi-exclamation-triangle" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-slate-50 transition">
            İptal
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition"
            style={{ background: "var(--color-primary)" }}>
            {saving ? <><i className="pi pi-spin pi-spinner mr-2" />Kaydediliyor…</> : "Müşteri Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
