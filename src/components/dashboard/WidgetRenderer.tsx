"use client";

import { useEffect, useState, useRef } from "react";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement, PointElement,
    ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import type { WidgetConfig } from "@/lib/dashboard-data-client";
import { DATA_SOURCES } from "@/lib/dashboard-data-client";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

interface DBWidget {
  id: string;
  title: string;
  type: string;
  dataSource: string;
  config: string;
  w: number;
  h: number;
}

interface WidgetRendererProps {
  widget: DBWidget;
  onDelete?: (id: string) => void;
  onEdit?:   (id: string) => void;
}

async function fetchWidgetData(widget: DBWidget): Promise<{ value?: number; rows?: Record<string, unknown>[] }> {
  const cfg = JSON.parse(widget.config) as WidgetConfig;

  async function post(body: Record<string, unknown>): Promise<{ value?: number; rows?: Record<string, unknown>[] }> {
    try {
      const r = await fetch("/api/dashboard/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return {};
      return r.json() as Promise<{ value?: number; rows?: Record<string, unknown>[] }>;
    } catch {
      return {};
    }
  }

  if (widget.type === "stat") {
    return post({ source: widget.dataSource, queryType: "aggregate", filters: cfg.filters, aggregate: cfg.aggregate ?? "count", aggregateField: cfg.aggregateField });
  }

  if (widget.type === "chart" && cfg.groupByField) {
    return post({ source: widget.dataSource, queryType: "groupBy", filters: cfg.filters, groupByField: cfg.groupByField, limit: cfg.limit ?? 10 });
  }

  return post({ source: widget.dataSource, queryType: "rows", filters: cfg.filters, columns: cfg.columns ?? cfg.listFields, sortField: cfg.sortField, sortDir: cfg.sortDir, limit: cfg.limit ?? 20 });
}

const CHART_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6",
];

export function WidgetRenderer({ widget, onDelete, onEdit }: WidgetRendererProps) {
  const [data, setData] = useState<{ value?: number; rows?: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cfg = JSON.parse(widget.config) as WidgetConfig;
  const src = DATA_SOURCES.find((s) => s.id === widget.dataSource);

  useEffect(() => {
    void fetchWidgetData(widget).then((d) => { setData(d); setLoading(false); });
  }, [widget]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function exportCSV() {
    const rows = data?.rows ?? [];
    if (!rows.length) return;
    const keys  = Object.keys(rows[0]);
    const lines = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))];
    const blob  = new Blob([lines.join("\n")], { type: "text/csv" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href = url; a.download = `${widget.title}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {cfg.icon && <i className={`pi ${cfg.icon} text-sm shrink-0`} style={{ color: cfg.color ?? "var(--color-primary)" }} />}
          <span className="text-sm font-semibold text-foreground truncate">{widget.title}</span>
          {src && <span className="text-xs text-slate-400 shrink-0 hidden lg:inline">· {src.label}</span>}
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button onClick={() => setMenuOpen((v) => !v)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
            <i className="pi pi-ellipsis-v text-xs" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl py-1 z-20">
              {onEdit && <button onClick={() => { onEdit(widget.id); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground flex items-center gap-2"><i className="pi pi-pencil w-4" /> Düzenle</button>}
              <button onClick={() => { exportCSV(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground flex items-center gap-2"><i className="pi pi-download w-4" /> CSV İndir</button>
              {onDelete && <button onClick={() => { onDelete(widget.id); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"><i className="pi pi-trash w-4" /> Sil</button>}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-auto min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400"><i className="pi pi-spin pi-spinner text-xl" /></div>
        ) : widget.type === "stat" ? (
          <StatContent value={data?.value ?? 0} cfg={cfg} />
        ) : widget.type === "chart" ? (
          <ChartContent rows={(data?.rows ?? []) as Array<{ label: string; value: number }>} cfg={cfg} />
        ) : widget.type === "table" ? (
          <TableContent rows={data?.rows ?? []} cfg={cfg} src={src} />
        ) : widget.type === "list" ? (
          <ListContent rows={data?.rows ?? []} cfg={cfg} />
        ) : null}
      </div>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  title: "Başlık",
  name: "Ad",
  status: "Durum",
  priority: "Öncelik",
  type: "Tür",
  category: "Kategori",
  createdAt: "Oluşturulma",
  updatedAt: "Güncellenme",
  dueDate: "Son Tarih",
  startDate: "Başlangıç",
  endDate: "Bitiş",
  email: "E-posta",
  phone: "Telefon",
  city: "Şehir",
  sku: "SKU",
  quantity: "Miktar",
  unit: "Birim",
  price: "Fiyat",
  cost: "Maliyet",
  totalAmount: "Toplam Tutar",
  amount: "Tutar",
  currency: "Para Birimi",
  isActive: "Aktif",
  isRead: "Okundu",
  action: "İşlem",
  module: "Modül",
  userId: "Kullanıcı",
  description: "Açıklama",
  stage: "Aşama",
  pipelineStage: "Aşama",
  orderDate: "Sipariş Tarihi",
  saleNo: "Sipariş No",
  assignedTo: "Atanan",
  createdBy: "Oluşturan",
  progress: "İlerleme",
  role: "Rol",
  tags: "Etiketler",
};

const VALUE_LABELS: Record<string, string> = {
  in_progress: "Devam Ediyor",
  todo: "Yapılacak",
  done: "Tamamlandı",
  review: "İnceleme",
  cancelled: "İptal Edildi",
  canceled: "İptal Edildi",
  planning: "Planlama",
  active: "Aktif",
  inactive: "Pasif",
  on_hold: "Beklemede",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
  pending: "Beklemede",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  draft: "Taslak",
  open: "Açık",
  closed: "Kapalı",
  delivered: "Teslim Edildi",
  invoiced: "Faturalandı",
  shipped: "Kargolandı",
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
  critical: "Kritik",
  lead: "Aday",
  prospect: "Görüşme",
  proposal: "Teklif",
  negotiation: "Müzakere",
  won: "Kazanıldı",
  lost: "Kaybedildi",
  corporate: "Kurumsal",
  individual: "Bireysel",
  epic: "Epic",
  story: "Hikaye",
  task: "Görev",
  bug: "Hata",
  subtask: "Alt Görev",
};

function getFieldLabel(col: string, src?: { fields: Array<{ name: string; label: string }> }): string {
  const fromSrc = src?.fields.find((f) => f.name === col)?.label;
  if (fromSrc) return fromSrc;
  if (FIELD_LABELS[col]) return FIELD_LABELS[col];
  return col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
}

function formatWidgetValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";

  if (typeof val === "boolean") {
    return val ? "Evet" : "Hayır";
  }

  if (typeof val === "number") {
    return val.toLocaleString("tr-TR");
  }

  if (val instanceof Date) {
    return val.toLocaleDateString("tr-TR");
  }

  if (typeof val === "string") {
    const lower = val.toLowerCase();
    if (VALUE_LABELS[lower]) {
      return VALUE_LABELS[lower];
    }

    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
    if (isoDateRegex.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        if (val.includes("T")) {
          const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
          return hasTime
            ? d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
    }

    return val;
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.title) return String(obj.title);
    return JSON.stringify(val);
  }

  return String(val);
}

// ─── Stat ──────────────────────────────────────────────────────────────────────
function StatContent({ value, cfg }: { value: number; cfg: WidgetConfig }) {
  const display = typeof value === "number" && Number.isFinite(value)
    ? (cfg.aggregate === "avg" ? value.toFixed(2) : value.toLocaleString("tr-TR"))
    : "—";
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      {cfg.icon && (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ background: cfg.color ?? "var(--color-primary)" }}>
          <i className={`pi ${cfg.icon} text-xl`} />
        </div>
      )}
      <p className="text-4xl font-bold text-foreground">{cfg.prefix}{display}{cfg.suffix}</p>
    </div>
  );
}

// ─── Chart ─────────────────────────────────────────────────────────────────────
function ChartContent({ rows, cfg }: { rows: Array<{ label: string; value: number }>; cfg: WidgetConfig }) {
  if (!rows.length) return <EmptyState />;
  const labels = rows.map((r) => formatWidgetValue(r.label));
  const values = rows.map((r) => r.value);
  const datasets = [{ data: values, backgroundColor: CHART_COLORS, borderColor: CHART_COLORS, borderWidth: 1.5, borderRadius: 4 }];
  const chartData = { labels, datasets };
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: cfg.chartType === "pie" || cfg.chartType === "doughnut" } } };

  if (cfg.chartType === "pie")      return <div className="h-full"><Pie      data={chartData} options={{ ...opts, plugins: { legend: { position: "right" } } }} /></div>;
  if (cfg.chartType === "doughnut") return <div className="h-full"><Doughnut data={chartData} options={{ ...opts, plugins: { legend: { position: "right" } } }} /></div>;
  if (cfg.chartType === "line")     return <div className="h-full"><Line     data={{ labels, datasets: [{ ...datasets[0], fill: false, tension: 0.3 }] }} options={opts} /></div>;
  return <div className="h-full"><Bar data={chartData} options={opts} /></div>;
}

// ─── Table ─────────────────────────────────────────────────────────────────────
function TableContent({ rows, cfg, src }: { rows: Record<string, unknown>[]; cfg: WidgetConfig; src?: { fields: Array<{ name: string; label: string }> } }) {
  if (!rows.length) return <EmptyState />;
  const cols = cfg.columns ?? Object.keys(rows[0] ?? {}).filter((k) => k !== "id").slice(0, 5);
  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className="text-left px-2 py-1.5 text-slate-500 font-medium border-b border-border sticky top-0 bg-white dark:bg-slate-900 whitespace-nowrap">
                {getFieldLabel(c, src)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1.5 border-b border-border/50 text-foreground truncate max-w-32" title={formatWidgetValue(row[c])}>
                  {formatWidgetValue(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── List ──────────────────────────────────────────────────────────────────────
function ListContent({ rows, cfg }: { rows: Record<string, unknown>[]; cfg: WidgetConfig }) {
  if (!rows.length) return <EmptyState />;
  const fields = cfg.listFields ?? cfg.columns ?? Object.keys(rows[0] ?? {}).filter((k) => k !== "id").slice(0, 2);
  const [primary, ...rest] = fields;
  return (
    <div className="space-y-1 overflow-auto h-full">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
          <span className="text-sm text-foreground truncate">{formatWidgetValue(row[primary])}</span>
          {rest[0] && <span className="text-xs text-slate-400 shrink-0 truncate max-w-20">{formatWidgetValue(row[rest[0]])}</span>}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-2">
      <i className="pi pi-inbox text-2xl" />
      <p className="text-xs">Veri yok</p>
    </div>
  );
}
