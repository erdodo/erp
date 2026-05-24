"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PIPELINE_STAGES, CUSTOMER_TYPES, type CrmCustomer } from "@/lib/crm-types";

interface Props {
  initialCustomers: CrmCustomer[];
  initialTotal:     number;
  initialPages:     number;
}

// SORT_FIELDS is now generated dynamically with useTranslations below

interface ContextMenu { x: number; y: number; customer: CrmCustomer }

export function CustomerTable({ initialCustomers, initialTotal, initialPages }: Props) {
  const router = useRouter();
  const t = useTranslations("common");
  
  const SORT_FIELDS = [
    { id: "createdAt", label: t("labels.created") },
    { id: "updatedAt", label: t("audit.actions.update") },
    { id: "name",      label: t("labels.name") },
  ];
  
  const [customers, setCustomers]   = useState(initialCustomers);
  const [total, setTotal]           = useState(initialTotal);
  const [pages, setPages]           = useState(initialPages);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [sortField, setSortField]     = useState("createdAt");
  const [sortDir, setSortDir]         = useState<"asc"|"desc">("desc");
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; stage?: string; type?: string; sf?: string; sd?: string }) => {
    setLoading(true);
    const p  = opts?.pg    ?? page;
    const q  = opts?.s     ?? search;
    const st = opts?.stage ?? stageFilter;
    const ty = opts?.type  ?? typeFilter;
    const sf = opts?.sf    ?? sortField;
    const sd = opts?.sd    ?? sortDir;
    const params = new URLSearchParams({ page: String(p), search: q, stage: st, type: ty, sort: sf, dir: sd });
    const r = await fetch(`/api/modules/crm/customers?${params}`);
    const data = await r.json() as { customers: CrmCustomer[]; total: number; pages: number };
    setCustomers(data.customers);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, search, stageFilter, typeFilter, sortField, sortDir]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "/" || (e.altKey && e.key === "f")) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setContextMenu(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Close context menu on outside click — use mousedown + setTimeout to avoid
  // React 18 batching and native-vs-synthetic event race conditions
  useEffect(() => {
    if (!contextMenu) return;
    let handler: ((e: MouseEvent) => void) | null = null;
    const t = setTimeout(() => {
      handler = () => setContextMenu(null);
      window.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(t);
      if (handler) window.removeEventListener("mousedown", handler);
    };
  }, [contextMenu]);

  function handleContextMenu(e: React.MouseEvent, customer: CrmCustomer) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, customer });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((c) => c.id)));
  }

  async function bulkDelete() {
    if (!confirm(`${selected.size} ${t("labels.customers")} ${t("app.delete")}. ${t("app.confirm")}?`)) return;
    setBulkLoading(true);
    await Promise.all([...selected].map((id) => fetch(`/api/modules/crm/customers/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    await load();
    setBulkLoading(false);
  }

  async function deleteOne(id: string) {
    if (!confirm(t("confirmations.deleteCustomer"))) return;
    await fetch(`/api/modules/crm/customers/${id}`, { method: "DELETE" });
    setContextMenu(null);
    await load();
  }

  async function moveStage(id: string, stage: string) {
    await fetch(`/api/modules/crm/customers/${id}/stage`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
    setContextMenu(null);
    await load();
  }

  function exportCsv() {
    const headers = [t("labels.name"), t("crm.customerType.corporate"), t("labels.email"), t("labels.phone"), t("labels.city"), t("crm.pipelineStage.customer"), t("labels.createdAt")];
    const rows = customers.map((c) => [
      c.name, c.type, c.email ?? "", c.phone ?? "", c.city ?? "",
      c.pipelineStage, new Date(c.createdAt).toLocaleDateString("tr-TR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "musteriler.csv";
    a.click();
  }

  const allSelected = customers.length > 0 && selected.size === customers.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t("crm.customers")} ${t("app.search")} (/ ${t("app.search")})`}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties}
          />
        </div>

        {/* Stage filter */}
        <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); void load({ pg: 1, stage: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
          <option value="">{t("app.all")} {t("crm.pipeline")}</option>
          {PIPELINE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* Type filter */}
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); void load({ pg: 1, type: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
          <option value="">{t("app.all")} {t("labels.type")}</option>
          {CUSTOMER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {/* Sort */}
        <select value={`${sortField}:${sortDir}`} onChange={(e) => {
          const [sf, sd] = e.target.value.split(":") as [string, "asc"|"desc"];
          setSortField(sf); setSortDir(sd); void load({ sf, sd });
        }} className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
          {SORT_FIELDS.flatMap((f) => [
            <option key={`${f.id}:desc`} value={`${f.id}:desc`}>{f.label} ↓</option>,
            <option key={`${f.id}:asc`}  value={`${f.id}:asc`}>{f.label} ↑</option>,
          ])}
        </select>

        <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition" title={t("app.downloadCsv")}>
          <i className="pi pi-download" />
        </button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/30 bg-blue-50/50 dark:bg-blue-950/20 text-sm"
          style={{ borderColor: "var(--color-primary)33" }}>
          <span className="font-medium text-foreground">{selected.size} {t("app.active")}</span>
          <button onClick={bulkDelete} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition text-xs font-medium">
            <i className="pi pi-trash text-xs" /> {t("app.delete")}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-foreground ml-auto">
            {t("app.reset")}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
            <i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} />
          </div>
        )}
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="w-10 py-3 px-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">{t("labels.customer")}</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">{t("labels.phone")}</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">{t("labels.city")}</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">{t("crm.pipeline")}</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">{t("crm.interactions")}</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden xl:table-cell">{t("labels.date")}</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <i className="pi pi-users text-4xl block mb-2 opacity-30" />
                    {search || stageFilter || typeFilter ? t("table.noResults") : t("table.noData")}
                  </td>
                </tr>
              ) : customers.map((c) => {
                const stage = PIPELINE_STAGES.find((s) => s.id === c.pipelineStage) ?? PIPELINE_STAGES[0];
                const isSelected = selected.has(c.id);
                return (
                  <tr key={c.id}
                    onContextMenu={(e) => handleContextMenu(e, c)}
                    className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("input,a,button")) return;
                      router.push(`/dashboard/crm/customers/${c.id}`);
                    }}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} className="rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: "var(--color-primary)" }}>
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <Link href={`/dashboard/crm/customers/${c.id}`}
                            className="font-medium text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {c.name}
                          </Link>
                          <p className="text-xs text-slate-400">{c.type === "corporate" ? t("crm.customerType.corporate") : t("crm.customerType.individual")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-500">
                      <div>{c.email ?? "—"}</div>
                      {c.phone && <div className="text-xs">{c.phone}</div>}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-500">{c.city ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stage.bg}`}>
                        <i className={`pi ${stage.icon} text-xs`} />{stage.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-500">
                      {c._count?.interactions ?? 0}
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-slate-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleContextMenu(e as unknown as React.MouseEvent, c); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400">
                        <i className="pi pi-ellipsis-v text-xs" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} {t("app.rows")}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page - 1); void load({ pg: page - 1 }); }}
              disabled={page <= 1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30 transition">
              <i className="pi pi-chevron-left text-xs" />
            </button>
            <span className="px-3">{page} / {pages || 1}</span>
            <button onClick={() => { setPage(page + 1); void load({ pg: page + 1 }); }}
              disabled={page >= pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30 transition">
              <i className="pi pi-chevron-right text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-52 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground truncate">{contextMenu.customer.name}</p>
            <p className="text-xs text-slate-400">{contextMenu.customer.type === "corporate" ? t("crm.customerType.corporate") : t("crm.customerType.individual")}</p>
          </div>
          <button onClick={() => { router.push(`/dashboard/crm/customers/${contextMenu.customer.id}`); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-eye text-slate-400" /> {t("app.view")}
          </button>
          <button onClick={() => { router.push(`/dashboard/crm/customers/${contextMenu.customer.id}?tab=interactions`); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-list text-slate-400" /> {t("crm.interactions")}
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <p className="px-3 py-1 text-xs text-slate-400 font-medium">{t("crm.pipeline")}</p>
            {PIPELINE_STAGES.map((s) => (
              <button key={s.id} onClick={() => moveStage(contextMenu.customer.id, s.id)}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition text-xs ${
                  contextMenu.customer.pipelineStage === s.id ? "font-semibold" : ""
                }`}>
                <i className={`pi ${s.icon} text-xs`} style={{ color: s.color }} />
                {s.label}
                {contextMenu.customer.pipelineStage === s.id && <i className="pi pi-check ml-auto text-xs" style={{ color: "var(--color-primary)" }} />}
              </button>
            ))}
          </div>
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteOne(contextMenu.customer.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> {t("app.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
