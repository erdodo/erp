"use client";

import { useState, useEffect, useCallback } from "react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  tenantId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  tenant: { name: string; slug: string } | null;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/superadmin/users?search=${encodeURIComponent(search)}&page=${page}`);
    const data = await r.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { void load(); }, [load]);

  async function toggleActive(u: UserRow) {
    await fetch(`/api/superadmin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  }

  async function resetPassword() {
    if (!actionUser || !newPassword) return;
    setSaving(true);
    await fetch(`/api/superadmin/users/${actionUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setActionUser(null);
    setNewPassword("");
    setSaving(false);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-users text-amber-500" /> Tüm Kullanıcılar
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} kullanıcı</p>
        </div>
      </div>

      <div className="relative">
        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kullanıcı veya e-posta ara..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground focus:outline-none text-sm"
        />
      </div>

      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Kullanıcı</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tenant</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Rol</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Son Giriş</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner mr-2" />Yükleniyor...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Kullanıcı bulunamadı</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.tenant?.name ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-center">
                  {u.isAdmin ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Admin</span> : <span className="text-xs text-slate-400">Kullanıcı</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {u.isActive ? "Aktif" : "Pasif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("tr-TR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setActionUser(u)}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                    title="Şifre Sıfırla"
                  >
                    <i className="pi pi-key text-xs" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-slate-500">{total} kayıt</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Önceki</button>
              <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Sonraki</button>
            </div>
          </div>
        )}
      </div>

      {/* Password reset modal */}
      {actionUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Şifre Sıfırla</h2>
            <p className="text-sm text-slate-500">{actionUser.name} ({actionUser.email})</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yeni şifre (min. 6 karakter)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => { setActionUser(null); setNewPassword(""); }} className="flex-1 py-2 rounded-lg border border-border text-sm">İptal</button>
              <button
                onClick={resetPassword}
                disabled={newPassword.length < 6 || saving}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                style={{ background: "var(--color-primary)" }}
              >
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Sıfırla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
