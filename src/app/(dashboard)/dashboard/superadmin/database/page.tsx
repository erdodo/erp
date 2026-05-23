"use client";

import { useState, useEffect, useCallback } from "react";

const TABLES = [
  "Tenant", "User", "Role", "Permission", "RolePermission",
  "TenantModule", "TenantQuota", "AuditLog", "Notification",
  "Customer", "Sale", "Project", "Task", "Employee", "Department",
  "StockItem", "Warehouse", "Equipment", "Vehicle",
];

interface TableRow { [key: string]: unknown }

export default function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState("Tenant");
  const [rows, setRows] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ table: selectedTable, page: String(page), search });
    const r = await fetch(`/api/superadmin/database?${params}`);
    if (r.ok) {
      const data = await r.json();
      setRows(data.rows ?? []);
      setColumns(data.columns ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [selectedTable, page, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [selectedTable, search]);

  return (
    <div className="max-w-full mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <i className="pi pi-database text-amber-500" /> Veritabanı Yöneticisi
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Salt okunur tablo görüntüleme</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
        >
          {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID veya alan değeri ile ara..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
          />
        </div>
        <span className="self-center text-sm text-slate-500">{total} kayıt</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner mr-2" />Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-slate-400">Kayıt bulunamadı</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {columns.map((c) => {
                    const val = row[c];
                    const str = val === null || val === undefined ? "" : String(val);
                    const isId = c === "id" || c.endsWith("Id");
                    const isBool = typeof val === "boolean";
                    const isDate = c.endsWith("At") || c.endsWith("Date");
                    return (
                      <td key={c} className="px-3 py-2 max-w-48 truncate">
                        {isBool ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${val ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {val ? "true" : "false"}
                          </span>
                        ) : isDate && str ? (
                          <span className="text-slate-400">{new Date(str).toLocaleString("tr-TR")}</span>
                        ) : isId ? (
                          <span className="font-mono text-slate-400 text-xs">{str.slice(0, 8)}…</span>
                        ) : (
                          <span className={str.length > 60 ? "text-slate-500" : "text-foreground"}>{str.slice(0, 80)}{str.length > 80 ? "…" : ""}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-slate-500">Sayfa {page}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Önceki</button>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40">Sonraki</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
