"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AdminNav } from "@/components/admin/AdminNav";
import { MODULE_GROUPS } from "@/lib/modules-data";
import type { ModuleDef } from "@/lib/modules-data";
import { ALL_MODULES } from "@/lib/modules-data";

const ACTIONS = [
  { key: "read", label: "Görüntüle" },
  { key: "create", label: "Ekle" },
  { key: "update", label: "Düzenle" },
  { key: "delete", label: "Sil" },
  { key: "export", label: "Export" },
];

type Permission = { module: string; action: string };

interface RoleWithPerms {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number };
  permissions: { permission: Permission }[];
}

function permSet(perms: { permission: Permission }[]): Set<string> {
  return new Set(perms.map((p) => `${p.permission.module}:${p.permission.action}`));
}

export default function AdminRolesPage() {
  const t = useTranslations();
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPerms | null>(null);
  const [matrix, setMatrix] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/roles");
    const data = await r.json();
    const roleList: RoleWithPerms[] = data.roles ?? [];
    setRoles(roleList);
    if (selectedRole) {
      const updated = roleList.find((r) => r.id === selectedRole.id);
      if (updated) { setSelectedRole(updated); setMatrix(permSet(updated.permissions)); }
    }
    setLoading(false);
  }, [selectedRole]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectRole(role: RoleWithPerms) {
    setSelectedRole(role);
    setMatrix(permSet(role.permissions));
    setSavedMsg("");
  }

  function togglePerm(module: string, action: string) {
    const key = `${module}:${action}`;
    setMatrix((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll(mod: ModuleDef, activate: boolean) {
    setMatrix((prev) => {
      const next = new Set(prev);
      ACTIONS.forEach((a) => {
        const key = `${mod.slug}:${a.key}`;
        if (activate) next.add(key); else next.delete(key);
      });
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    const permissions = Array.from(matrix).map((k) => {
      const [module, action] = k.split(":");
      return { module, action };
    });
    await fetch(`/api/admin/roles/${selectedRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    setSavedMsg(`${t("success.savedSuccessfully")} ✓`);
    setSaving(false);
    await load();
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const r = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await r.json();
    setNewName("");
    setShowCreate(false);
    setCreating(false);
    await load();
    if (data.role) selectRole({ ...data.role, _count: { users: 0 }, permissions: [] });
  }

  async function deleteRole(id: string) {
    if (!confirm(t("confirmations.deleteRole"))) return;
    const r = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) { alert(data.error); return; }
    if (selectedRole?.id === id) setSelectedRole(null);
    await load();
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <i className="pi pi-shield" style={{ color: "var(--color-primary)" }} /> {t("forms.editRole")}
          <span className="text-sm font-normal text-slate-400 ml-1">{t("table.filter")}</span>
        </h1>
        <div className="flex items-center justify-between gap-3">
          <AdminNav />
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shrink-0" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus" /> {t("forms.newRole")}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Role list */}
        <div className="w-56 shrink-0 space-y-1">
          {loading ? <div className="py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner" /></div> : roles.map((role) => (
            <button key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedRole?.id === role.id ? "text-white font-medium" : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              style={selectedRole?.id === role.id ? { background: "var(--color-primary)" } : {}}
            >
              <p className="font-medium">{role.name}</p>
              <p className={`text-xs mt-0.5 ${selectedRole?.id === role.id ? "text-white/70" : "text-slate-400"}`}>{role._count.users} {t("labels.users")}</p>
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="flex-1 min-w-0">
          {!selectedRole ? (
            <div className="flex items-center justify-center h-64 text-slate-400 border border-dashed border-border rounded-xl">
              <div className="text-center">
                <i className="pi pi-shield text-3xl mb-2" />
                <p className="text-sm">{t("forms.editRole")} {t("app.search")}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-800">
                <div>
                  <span className="font-semibold text-foreground">{selectedRole.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{matrix.size} {t("sidebar.nav.admin")}</span>
                </div>
                <div className="flex items-center gap-2">
                  {savedMsg && <span className="text-xs text-green-600">{savedMsg}</span>}
                  <button onClick={() => deleteRole(selectedRole.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400 text-xs"><i className="pi pi-trash" /></button>
                  <button onClick={savePermissions} disabled={saving} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                    {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-48">{t("sidebar.nav.admin")}</th>
                      {ACTIONS.map((a) => (
                        <th key={a.key} className="px-3 py-2.5 text-center font-medium text-slate-600 w-20">{a.label}</th>
                      ))}
                      <th className="px-3 py-2.5 text-center font-medium text-slate-500 w-16">{t("app.all")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MODULE_GROUPS.map((group) => {
                      const groupMods = ALL_MODULES.filter((m) => m.group === group);
                      if (groupMods.length === 0) return null;
                      return groupMods.map((mod, mi) => {
                        const allChecked = ACTIONS.every((a) => matrix.has(`${mod.slug}:${a.key}`));
                        return (
                          <tr key={mod.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            {mi === 0 && (
                              <td rowSpan={groupMods.length} className="px-2 py-0 text-center align-top">
                                <span className="block mt-3 text-xs text-slate-400 rotate-[-90deg] origin-center" style={{ writingMode: "vertical-rl" }}>{group}</span>
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <i className={`pi ${mod.icon} text-slate-400`} />
                                <span className="text-foreground">{mod.name}</span>
                              </div>
                            </td>
                            {ACTIONS.map((a) => (
                              <td key={a.key} className="px-3 py-2 text-center">
                                <input type="checkbox" checked={matrix.has(`${mod.slug}:${a.key}`)}
                                  onChange={() => togglePerm(mod.slug, a.key)}
                                  className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: "var(--color-primary)" }} />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center">
                              <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(mod, e.target.checked)}
                                className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: "var(--color-secondary)" }} />
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={createRole} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-foreground">{t("forms.newRole")}</h2>
            <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("placeholders.roleName")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-sm focus:outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">{t("app.cancel")}</button>
              <button type="submit" disabled={creating} className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {creating ? <i className="pi pi-spin pi-spinner" /> : t("app.create")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
