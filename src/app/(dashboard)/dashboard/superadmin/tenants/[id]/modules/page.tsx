"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { MODULE_GROUPS } from "@/lib/modules-data";

const ALL_ACTIONS = ["read", "create", "update", "delete", "export"] as const;
type Action = typeof ALL_ACTIONS[number];
const ACTION_LABELS: Record<Action, string> = { read: "Görüntüle", create: "Ekle", update: "Düzenle", delete: "Sil", export: "Export" };

interface ModuleStatus {
  slug: string;
  name: string;
  icon: string;
  group: string;
  isActive: boolean;
  allowedActions: string;
}

export default function TenantModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/superadmin/tenants/${id}/modules`);
    const data = await r.json();
    setModules(data.modules ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(slug: string, payload: { isActive?: boolean; allowedActions?: string }) {
    setSaving(slug);
    await fetch(`/api/superadmin/tenants/${id}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...payload }),
    });
    setModules((prev) => prev.map((m) => m.slug === slug ? { ...m, ...payload } : m));
    setSaving(null);
  }

  function toggleAction(m: ModuleStatus, action: Action) {
    const current = m.allowedActions.split(",").filter(Boolean);
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    void patch(m.slug, { allowedActions: next.join(",") });
  }

  async function toggleAll(group: string, activate: boolean) {
    const groupMods = modules.filter((m) => m.group === group);
    for (const m of groupMods) {
      if (m.isActive !== activate) await patch(m.slug, { isActive: activate });
    }
  }

  const activeCount = modules.filter((m) => m.isActive).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/superadmin/tenants/${id}`} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-slate-100 transition text-slate-500">
          <i className="pi pi-arrow-left text-sm" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-th-large text-amber-500" /> Modül Yönetimi
          </h1>
          <p className="text-slate-500 text-sm">{activeCount}/{modules.length} modül aktif · İzin ikonuna tıklayarak eylem bazlı kısıtlama yapın</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400"><i className="pi pi-spin pi-spinner text-2xl" /></div>
      ) : (
        <div className="space-y-4">
          {MODULE_GROUPS.map((group) => {
            const groupMods = modules.filter((m) => m.group === group);
            const allActive = groupMods.every((m) => m.isActive);
            if (groupMods.length === 0) return null;
            return (
              <div key={group} className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-800">
                  <h3 className="font-medium text-foreground text-sm">{group}</h3>
                  <button
                    onClick={() => toggleAll(group, !allActive)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-white dark:hover:bg-slate-700 text-slate-600 transition"
                  >
                    {allActive ? "Tümünü Kapat" : "Tümünü Aç"}
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {groupMods.map((m) => {
                    const actions = m.allowedActions.split(",").filter(Boolean);
                    const isExpanded = expanded === m.slug;
                    return (
                      <div key={m.slug}>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${m.isActive ? "text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"}`}
                            style={m.isActive ? { background: "var(--color-primary)" } : {}}
                          >
                            <i className={`pi ${m.icon} text-xs`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{m.name}</p>
                            {m.isActive && (
                              <p className="text-xs text-slate-400">{actions.map((a) => ACTION_LABELS[a as Action] ?? a).join(" · ")}</p>
                            )}
                          </div>
                          {m.isActive && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : m.slug)}
                              title="Eylem izinlerini düzenle"
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500"
                            >
                              <i className="pi pi-sliders-h text-xs" />
                            </button>
                          )}
                          <button
                            onClick={() => patch(m.slug, { isActive: !m.isActive })}
                            disabled={saving === m.slug}
                            title={m.isActive ? "Modülü kapat" : "Modülü aç"}
                            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${m.isActive ? "bg-green-500" : "bg-slate-200 dark:bg-slate-600"}`}
                          >
                            {saving === m.slug ? (
                              <i className="pi pi-spin pi-spinner absolute top-0.5 left-1 text-xs text-white" />
                            ) : (
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                            )}
                          </button>
                        </div>
                        {isExpanded && m.isActive && (
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-border flex flex-wrap gap-2">
                            {ALL_ACTIONS.map((action) => {
                              const allowed = actions.includes(action);
                              return (
                                <button
                                  key={action}
                                  onClick={() => toggleAction(m, action)}
                                  disabled={saving === m.slug}
                                  title={allowed ? `${ACTION_LABELS[action]} iznini kaldır` : `${ACTION_LABELS[action]} iznini ver`}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${allowed ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "border-border bg-white dark:bg-slate-800 text-slate-400"}`}
                                >
                                  <i className={`pi ${allowed ? "pi-check" : "pi-times"} mr-1`} />
                                  {ACTION_LABELS[action]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
