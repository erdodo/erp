"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
  tenant: { name: string; slug: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  ENABLE_MODULE: "bg-amber-100 text-amber-700",
  DISABLE_MODULE: "bg-slate-100 text-slate-600",
  UPDATE_QUOTA: "bg-cyan-100 text-cyan-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set("action", actionFilter);
    const r = await fetch(`/api/superadmin/audit-log?${params}`);
    const data = await r.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-history text-amber-500" /> Denetim Kaydı
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} kayıt</p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
        >
          <option value="">Tüm İşlemler</option>
          {Object.keys(ACTION_COLORS).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tarih</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Kullanıcı</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tenant</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">İşlem</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Modül</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner mr-2" />Yükleniyor...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Kayıt bulunamadı</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-foreground text-xs font-medium">{log.user?.name ?? "—"}</p>
                  <p className="text-slate-400 text-xs">{log.user?.email ?? ""}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{log.tenant?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{log.module}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 30 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-slate-500">{total} kayıt</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Önceki</button>
              <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Sonraki</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
