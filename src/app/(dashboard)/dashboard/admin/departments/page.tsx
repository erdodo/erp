"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

interface Dept {
  id: string;
  name: string;
  managerId: string | null;
  parentId: string | null;
  _count: { employees: number };
}

export default function AdminDepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Dept | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/departments");
    const data = await r.json();
    setDepts(data.departments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, parentId: form.parentId || null }),
    });
    setShowCreate(false);
    setForm({ name: "", parentId: "" });
    await load();
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editDept) return;
    setSaving(true);
    await fetch(`/api/admin/departments/${editDept.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, parentId: form.parentId || null }),
    });
    setEditDept(null);
    setForm({ name: "", parentId: "" });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu departmanı silmek istiyor musunuz?")) return;
    await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    await load();
  }

  function openEdit(d: Dept) {
    setEditDept(d);
    setForm({ name: d.name, parentId: d.parentId ?? "" });
  }

  const roots = depts.filter((d) => !d.parentId);
  const children = (parentId: string) => depts.filter((d) => d.parentId === parentId);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <i className="pi pi-sitemap" style={{ color: "var(--color-primary)" }} /> Departmanlar
          <span className="text-sm font-normal text-slate-400 ml-1">{depts.length} departman</span>
        </h1>
        <div className="flex items-center justify-between gap-3">
          <AdminNav />
          <button onClick={() => { setShowCreate(true); setForm({ name: "", parentId: "" }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shrink-0" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus" /> Yeni Departman
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400"><i className="pi pi-spin pi-spinner text-2xl" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 divide-y divide-border">
          {roots.length === 0 && <p className="px-5 py-8 text-center text-slate-400 text-sm">Henüz departman yok</p>}
          {roots.map((d) => (
            <div key={d.id}>
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2">
                  <i className="pi pi-building text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-slate-400">{d._count.employees} çalışan</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><i className="pi pi-pencil text-xs" /></button>
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><i className="pi pi-trash text-xs" /></button>
                </div>
              </div>
              {/* Children */}
              {children(d.id).map((c) => (
                <div key={c.id} className="flex items-center justify-between pl-12 pr-5 py-3 border-t border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <i className="pi pi-arrow-right text-slate-300 text-xs" />
                    <p className="text-sm text-foreground">{c.name}</p>
                    <span className="text-xs text-slate-400">{c._count.employees} çalışan</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><i className="pi pi-pencil text-xs" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><i className="pi pi-trash text-xs" /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || editDept) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={editDept ? handleUpdate : handleCreate} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-foreground">{editDept ? "Departman Düzenle" : "Yeni Departman"}</h2>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Departman Adı</label>
              <input type="text" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Üst Departman (isteğe bağlı)</label>
              <select value={form.parentId} onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none">
                <option value="">— Ana departman —</option>
                {depts.filter((d) => d.id !== editDept?.id && !d.parentId).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowCreate(false); setEditDept(null); }} className="flex-1 py-2 rounded-lg border border-border text-sm">İptal</button>
              <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : editDept ? "Kaydet" : "Oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
