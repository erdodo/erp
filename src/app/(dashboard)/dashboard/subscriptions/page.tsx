"use client";

import { useState, useEffect } from "react";

interface Subscription {
  id: string;
  name: string;
  plan: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  status: string;
  startDate: string;
  nextRenewal: string | null;
  customer: { id: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
  paused: "bg-amber-100 text-amber-700",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Aylık", yearly: "Yıllık", quarterly: "3 Aylık", weekly: "Haftalık",
};

interface SimpleStore { id: string; name: string }

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<SimpleStore[]>([]);
  const [form, setForm] = useState({ name: "", plan: "", amount: "", currency: "TRY", billingCycle: "monthly", startDate: new Date().toISOString().split("T")[0], storeId: "" });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusF) params.set("status", statusF);
    const r = await fetch(`/api/modules/subscriptions?${params}`);
    const data = await r.json();
    setSubs(data.subscriptions ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [statusF]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/modules/retail").then((r) => r.ok ? r.json() : { stores: [] }).then((d: { stores: SimpleStore[] }) => setStores(d.stores ?? []));
  }, []);

  async function save() {
    if (!form.name || !form.amount) return;
    setSaving(true);
    await fetch("/api/modules/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), storeId: form.storeId || undefined }),
    });
    setShowModal(false);
    setForm({ name: "", plan: "", amount: "", currency: "TRY", billingCycle: "monthly", startDate: new Date().toISOString().split("T")[0], storeId: "" });
    setSaving(false);
    void load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-credit-card" style={{ color: "var(--color-primary)" }} /> Abonelik Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Müşteri aboneliklerini takip edin</p>
        </div>
        <div className="flex gap-2">
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="cancelled">İptal</option>
            <option value="paused">Askıda</option>
            <option value="expired">Süresi Dolmuş</option>
          </select>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus text-xs" /> Yeni Abonelik
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400"><i className="pi pi-spin pi-spinner text-3xl" /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <i className="pi pi-credit-card text-4xl text-slate-300 mb-3 block" />
          <p className="text-slate-500 font-medium">Abonelik bulunamadı</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl text-white text-sm" style={{ background: "var(--color-primary)" }}>
            Abonelik Ekle
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-slate-50 dark:bg-slate-800">
                <tr>
                  {["Abonelik", "Plan", "Tutar", "Döngü", "Müşteri", "Sonraki Yenileme", "Durum", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.plan ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">{s.amount.toLocaleString("tr-TR")} {s.currency}</td>
                    <td className="px-4 py-3 text-slate-500">{CYCLE_LABELS[s.billingCycle] ?? s.billingCycle}</td>
                    <td className="px-4 py-3 text-slate-500">{s.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-border bg-background focus:outline-none">
                        <option value="active">Aktif</option>
                        <option value="paused">Askıya Al</option>
                        <option value="cancelled">İptal Et</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Yeni Abonelik</h2>
            <div className="space-y-3">
              {[
                { label: "Abonelik Adı *", key: "name", placeholder: "ör. Pro Plan Aboneliği" },
                { label: "Plan", key: "plan", placeholder: "ör. Pro, Starter" },
                { label: "Tutar *", key: "amount", placeholder: "ör. 299", type: "number" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
                  <input type={type ?? "text"} value={form[key as keyof typeof form]} placeholder={placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Para Birimi</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Döngü</label>
                  <select value={form.billingCycle} onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                    <option value="monthly">Aylık</option>
                    <option value="yearly">Yıllık</option>
                    <option value="quarterly">3 Aylık</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Başlangıç Tarihi</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
              {stores.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">İlgili Mağaza</label>
                  <select value={form.storeId} onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                    <option value="">Mağaza seçin (isteğe bağlı)</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.name || !form.amount} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
