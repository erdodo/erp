"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  module: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  info: "pi-info-circle text-blue-500",
  success: "pi-check-circle text-green-500",
  warning: "pi-exclamation-triangle text-yellow-500",
  error: "pi-times-circle text-red-500",
};

const TYPE_LABEL: Record<string, string> = {
  info: "Bilgi",
  success: "Başarı",
  warning: "Uyarı",
  error: "Hata",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ full: "1", page: String(page) });
    if (filterType) params.set("type", filterType);
    if (filterModule) params.set("module", filterModule);
    const r = await fetch(`/api/notifications?${params}`);
    const data = await r.json() as { items: NotificationItem[]; total: number; page: number; pages: number };
    setItems(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPages(data.pages);
    setLoading(false);
  }, [page, filterType, filterModule]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-bell" style={{ color: "var(--color-primary)" }} /> Bildirimler
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} bildirim{unreadCount > 0 ? `, ${unreadCount} okunmamış` : ""}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground transition">
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
        >
          <option value="">Tüm türler</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="text"
          placeholder="Modüle göre filtrele..."
          value={filterModule}
          onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none flex-1"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400"><i className="pi pi-spin pi-spinner text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <i className="pi pi-bell-slash text-4xl block mb-3" />
          <p className="text-sm">Bildirim bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 divide-y divide-border overflow-hidden">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex gap-4 px-5 py-4 transition ${!n.isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
            >
              <i className={`pi ${TYPE_ICON[n.type] ?? TYPE_ICON.info} text-xl mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.isRead ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.module && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{n.module}</span>
                    )}
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  title="Okundu işaretle"
                  className="shrink-0 text-slate-300 hover:text-slate-500 transition mt-1"
                >
                  <i className="pi pi-check text-sm" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            ← Önceki
          </button>
          <span className="text-sm text-slate-500">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
