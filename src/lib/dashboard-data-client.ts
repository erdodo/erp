// Client-safe: no prisma imports. Pure data definitions for dashboard widgets.

export interface SourceField {
  name: string;
  label: string;
  type: "string" | "number" | "date" | "boolean";
}

export interface DataSource {
  id: string;
  label: string;
  fields: SourceField[];
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "customer", label: "Müşteriler",
    fields: [
      { name: "name",      label: "Ad",         type: "string" },
      { name: "email",     label: "E-posta",     type: "string" },
      { name: "type",      label: "Tür",         type: "string" },
      { name: "city",      label: "Şehir",       type: "string" },
      { name: "createdAt", label: "Oluşturulma", type: "date"   },
    ],
  },
  {
    id: "task", label: "Görevler",
    fields: [
      { name: "title",     label: "Başlık",    type: "string" },
      { name: "status",    label: "Durum",     type: "string" },
      { name: "priority",  label: "Öncelik",   type: "string" },
      { name: "dueDate",   label: "Son Tarih", type: "date"   },
      { name: "createdAt", label: "Oluşturulma", type: "date" },
    ],
  },
  {
    id: "project", label: "Projeler",
    fields: [
      { name: "name",      label: "Proje Adı",  type: "string" },
      { name: "status",    label: "Durum",       type: "string" },
      { name: "startDate", label: "Başlangıç",  type: "date"   },
      { name: "endDate",   label: "Bitiş",      type: "date"   },
      { name: "createdAt", label: "Oluşturulma", type: "date"  },
    ],
  },
  {
    id: "stockItem", label: "Stok",
    fields: [
      { name: "name",      label: "Ürün Adı",   type: "string" },
      { name: "sku",       label: "SKU",         type: "string" },
      { name: "quantity",  label: "Miktar",      type: "number" },
      { name: "unit",      label: "Birim",       type: "string" },
      { name: "category",  label: "Kategori",    type: "string" },
      { name: "createdAt", label: "Oluşturulma", type: "date"   },
    ],
  },
  {
    id: "user", label: "Kullanıcılar",
    fields: [
      { name: "name",      label: "Ad",          type: "string"  },
      { name: "email",     label: "E-posta",     type: "string"  },
      { name: "isActive",  label: "Aktif",       type: "boolean" },
      { name: "createdAt", label: "Oluşturulma", type: "date"    },
    ],
  },
  {
    id: "auditLog", label: "Audit Log",
    fields: [
      { name: "action",    label: "Aksiyon", type: "string" },
      { name: "module",    label: "Modül",   type: "string" },
      { name: "userId",    label: "Kullanıcı", type: "string" },
      { name: "createdAt", label: "Tarih",   type: "date"   },
    ],
  },
  {
    id: "notification", label: "Bildirimler",
    fields: [
      { name: "title",     label: "Başlık",  type: "string"  },
      { name: "type",      label: "Tür",     type: "string"  },
      { name: "module",    label: "Modül",   type: "string"  },
      { name: "isRead",    label: "Okundu",  type: "boolean" },
      { name: "createdAt", label: "Tarih",   type: "date"    },
    ],
  },
];

export type WidgetType  = "stat" | "chart" | "table" | "list";
export type ChartType   = "bar"  | "line"  | "pie"   | "doughnut";
export type AggType     = "count" | "sum" | "avg";

export interface WidgetFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains";
  value: unknown;
}

export interface WidgetConfig {
  source:          string;
  filters?:        WidgetFilter[];
  sortField?:      string;
  sortDir?:        "asc" | "desc";
  limit?:          number;
  // stat
  aggregate?:      AggType;
  aggregateField?: string;
  prefix?:         string;
  suffix?:         string;
  icon?:           string;
  color?:          string;
  // chart
  chartType?:      ChartType;
  groupByField?:   string;
  // table / list
  columns?:        string[];
  listFields?:     string[];
}

export function getAvailableSources(): DataSource[] { return DATA_SOURCES; }
export function getSourceFields(sourceId: string): SourceField[] {
  return DATA_SOURCES.find((s) => s.id === sourceId)?.fields ?? [];
}
