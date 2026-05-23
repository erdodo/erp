"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface QuotaItem {
  resource: string;
  maxCount: number;
  currentCount: number;
  isUnlimited: boolean;
}

const RESOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  users: { label: "Kullanıcılar", icon: "pi-users" },
  customers: { label: "Müşteriler", icon: "pi-id-card" },
  projects: { label: "Projeler", icon: "pi-briefcase" },
  tasks: { label: "Görevler", icon: "pi-check" },
  employees: { label: "Çalışanlar", icon: "pi-user" },
  warehouses: { label: "Depolar", icon: "pi-box" },
  sales: { label: "Satışlar", icon: "pi-shopping-cart" },
  equipment: { label: "Ekipmanlar", icon: "pi-wrench" },
  vehicles: { label: "Araçlar", icon: "pi-car" },
};

export default function TenantQuotasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quotas, setQuotas] = useState<QuotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, Partial<QuotaItem>>>({});

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/superadmin/tenants/${id}/quotas`);
    const data = await r.json();
    setQuotas(data.quotas ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(resource: string, field: keyof QuotaItem, value: number | boolean) {
    setEdited((prev) => ({ ...prev, [resource]: { ...prev[resource], [field]: value } }));
  }

  function getValue(q: QuotaItem, field: keyof QuotaItem) {
    return (edited[q.resource]?.[field] as never) ?? q[field];
  }

  async function save(q: QuotaItem) {
    setSaving(q.resource);
    const payload = {
      resource: q.resource,
      maxCount: (getValue(q, "maxCount") as number) ?? q.maxCount,
      isUnlimited: (getValue(q, "isUnlimited") as boolean) ?? q.isUnlimited,
    };
    await fetch(`/api/superadmin/tenants/${id}/quotas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEdited((prev) => { const n = { ...prev }; delete n[q.resource]; return n; });
    await load();
    setSaving(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/superadmin/tenants/${id}`} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-slate-100 transition text-slate-500">
          <i className="pi pi-arrow-left text-sm" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-chart-bar text-amber-500" /> Kota Yönetimi
          </h1>
          <p className="text-slate-500 text-sm">Kaynak bazlı limitler</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400"><i className="pi pi-spin pi-spinner text-2xl" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-slate-600">Kaynak</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">Kullanım</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">Limit</th>
                <th className="px-5 py-3 text-center font-medium text-slate-600">Sınırsız</th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">Kaydet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotas.map((q) => {
                const meta = RESOURCE_LABELS[q.resource] ?? { label: q.resource, icon: "pi-database" };
                const isUnlimited = getValue(q, "isUnlimited") as boolean;
                const maxCount = getValue(q, "maxCount") as number;
                const pct = isUnlimited ? 100 : Math.min(100, (q.currentCount / maxCount) * 100);
                const isDirty = !!edited[q.resource];
                return (
                  <tr key={q.resource} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <i className={`pi ${meta.icon} text-slate-400`} />
                        <span className="font-medium text-foreground">{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">{q.currentCount} / {isUnlimited ? "∞" : maxCount}</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <input
                        type="number"
                        min={1}
                        disabled={isUnlimited}
                        value={maxCount}
                        onChange={(e) => patch(q.resource, "maxCount", parseInt(e.target.value) || 1)}
                        className="w-20 text-center px-2 py-1 rounded border border-border bg-white dark:bg-slate-800 text-foreground text-sm disabled:opacity-40 focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isUnlimited}
                        onChange={(e) => patch(q.resource, "isUnlimited", e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => save(q)}
                        disabled={!isDirty || saving === q.resource}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-30 transition"
                        style={{ background: isDirty ? "var(--color-primary)" : "#94a3b8" }}
                      >
                        {saving === q.resource ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
