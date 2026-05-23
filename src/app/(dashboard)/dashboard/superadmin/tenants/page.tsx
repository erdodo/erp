"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  primaryColor: string;
  _count: { users: number; modules: number };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/superadmin/tenants?search=${encodeURIComponent(search)}&page=${page}`);
    const data = await r.json();
    setTenants(data.tenants ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const r = await fetch("/api/superadmin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? "Hata"); setSaving(false); return; }
    setShowCreate(false);
    setForm({ name: "", slug: "" });
    await load();
    setSaving(false);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-building text-amber-500" /> Tenant Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} tenant</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus" /> Yeni Tenant
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Tenant ara..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 text-sm"
          style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Slug</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Kullanıcı</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Modül</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Oluşturulma</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner mr-2" />Yükleniyor...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Tenant bulunamadı</td></tr>
            ) : tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{ background: t.primaryColor }} />
                    <span className="font-medium text-foreground">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3 text-center text-foreground">{t._count.users}</td>
                <td className="px-4 py-3 text-center text-foreground">{t._count.modules}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(t.id, t.isActive)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${t.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {t.isActive ? "Aktif" : "Pasif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/dashboard/superadmin/tenants/${t.id}/modules`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition">
                      <i className="pi pi-th-large text-xs" />
                    </Link>
                    <Link href={`/dashboard/superadmin/tenants/${t.id}/quotas`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition">
                      <i className="pi pi-chart-bar text-xs" />
                    </Link>
                    <Link href={`/dashboard/superadmin/tenants/${t.id}`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition">
                      <i className="pi pi-pencil text-xs" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-slate-500">{total} kayıt</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-slate-50">Önceki</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-slate-50">Sonraki</button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Yeni Tenant Oluştur</h2>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">Şirket Adı</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground focus:outline-none text-sm"
                placeholder="Acme Ltd."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">Slug (URL)</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground focus:outline-none font-mono text-sm"
                placeholder="acme-ltd"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-slate-50 transition">İptal</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <><i className="pi pi-spin pi-spinner mr-1" />Kaydediliyor...</> : "Oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
