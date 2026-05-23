"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  role: { id: string; name: string } | null;
}
interface Role { id: string; name: string }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", isAdmin: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await r.json();
    setUsers(data.users ?? []);
    setRoles(data.roles ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, roleId: form.roleId || undefined }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? "Hata"); setSaving(false); return; }
    setShowCreate(false);
    setForm({ name: "", email: "", password: "", roleId: "", isAdmin: false });
    await load();
    setSaving(false);
  }

  async function handleUpdate(id: string, patch: object) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setEditUser(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <i className="pi pi-users" style={{ color: "var(--color-primary)" }} /> Kullanıcılar
          <span className="text-sm font-normal text-slate-400 ml-1">{users.length} kayıt</span>
        </h1>
        <div className="flex items-center justify-between gap-3">
          <AdminNav />
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shrink-0" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus" /> Yeni Kullanıcı
          </button>
        </div>
      </div>

      <div className="relative">
        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad veya e-posta ara..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
      </div>

      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Kullanıcı</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Rol</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Tip</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Son Giriş</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400"><i className="pi pi-spin pi-spinner mr-2" />Yükleniyor...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">Kullanıcı bulunamadı</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {u.role ? <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{u.role.name}</span> : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.isAdmin ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Admin</span> : <span className="text-xs text-slate-400">Kullanıcı</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleUpdate(u.id, { isActive: !u.isActive })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    {u.isActive ? "Aktif" : "Pasif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("tr-TR") : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><i className="pi pi-pencil text-xs" /></button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><i className="pi pi-trash text-xs" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Yeni Kullanıcı</h2>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
            {[
              { label: "Ad Soyad", field: "name" as const, type: "text" },
              { label: "E-posta", field: "email" as const, type: "email" },
              { label: "Şifre", field: "password" as const, type: "password" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-sm text-slate-600 mb-1 block">{label}</label>
                <input type={type} required value={form[field] as string} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Rol</label>
              <select value={form.roleId} onChange={(e) => setForm(f => ({ ...f, roleId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                <option value="">Rol seçin (isteğe bağlı)</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="w-4 h-4" />
              Admin yetkisi ver
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowCreate(false); setError(""); }} className="flex-1 py-2 rounded-lg border border-border text-sm">İptal</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Kullanıcı Düzenle</h2>
            <p className="text-sm text-slate-500">{editUser.email}</p>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Rol</label>
              <select defaultValue={editUser.role?.id ?? ""} id="edit-role"
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                <option value="">Rol yok</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Yeni Şifre (boş bırakılabilir)</label>
              <input type="password" id="edit-password" placeholder="Değiştirmek için girin"
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2 rounded-lg border border-border text-sm">İptal</button>
              <button
                onClick={() => {
                  const roleEl = document.getElementById("edit-role") as HTMLSelectElement;
                  const pwEl = document.getElementById("edit-password") as HTMLInputElement;
                  const patch: Record<string, unknown> = { roleId: roleEl.value || null };
                  if (pwEl.value.length >= 6) patch.newPassword = pwEl.value;
                  void handleUpdate(editUser.id, patch);
                }}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
