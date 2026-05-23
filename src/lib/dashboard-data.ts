import { prisma } from "@/lib/prisma";

// ─── Source Definitions ────────────────────────────────────────────────────────

export interface SourceField {
  name: string;
  label: string;
  type: "string" | "number" | "date" | "boolean";
}

export interface DataSource {
  id: string;
  label: string;
  softDelete: boolean;
  hasNoTenant?: boolean;
  fields: SourceField[];
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "customer", label: "Müşteriler", softDelete: true,
    fields: [
      { name: "name",      label: "Ad",         type: "string" },
      { name: "email",     label: "E-posta",     type: "string" },
      { name: "type",      label: "Tür",         type: "string" },
      { name: "city",      label: "Şehir",       type: "string" },
      { name: "createdAt", label: "Oluşturulma", type: "date"   },
    ],
  },
  {
    id: "task", label: "Görevler", softDelete: true,
    fields: [
      { name: "title",    label: "Başlık",   type: "string" },
      { name: "status",   label: "Durum",    type: "string" },
      { name: "priority", label: "Öncelik",  type: "string" },
      { name: "dueDate",  label: "Son Tarih", type: "date"  },
      { name: "createdAt", label: "Oluşturulma", type: "date" },
    ],
  },
  {
    id: "project", label: "Projeler", softDelete: true,
    fields: [
      { name: "name",      label: "Proje Adı",  type: "string" },
      { name: "status",    label: "Durum",       type: "string" },
      { name: "startDate", label: "Başlangıç",  type: "date"   },
      { name: "endDate",   label: "Bitiş",      type: "date"   },
      { name: "createdAt", label: "Oluşturulma", type: "date"  },
    ],
  },
  {
    id: "stockItem", label: "Stok", softDelete: true,
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
    id: "user", label: "Kullanıcılar", softDelete: false,
    fields: [
      { name: "name",      label: "Ad",          type: "string"  },
      { name: "email",     label: "E-posta",     type: "string"  },
      { name: "isActive",  label: "Aktif",       type: "boolean" },
      { name: "createdAt", label: "Oluşturulma", type: "date"    },
    ],
  },
  {
    id: "auditLog", label: "Audit Log", softDelete: false,
    fields: [
      { name: "action",    label: "Aksiyon", type: "string" },
      { name: "module",    label: "Modül",   type: "string" },
      { name: "userId",    label: "Kullanıcı", type: "string" },
      { name: "createdAt", label: "Tarih",   type: "date"   },
    ],
  },
  {
    id: "notification", label: "Bildirimler", softDelete: false,
    fields: [
      { name: "title",     label: "Başlık",  type: "string"  },
      { name: "type",      label: "Tür",     type: "string"  },
      { name: "module",    label: "Modül",   type: "string"  },
      { name: "isRead",    label: "Okundu",  type: "boolean" },
      { name: "createdAt", label: "Tarih",   type: "date"    },
    ],
  },
];

export function getAvailableSources(): DataSource[] {
  return DATA_SOURCES;
}

export function getSourceFields(sourceId: string): SourceField[] {
  return DATA_SOURCES.find((s) => s.id === sourceId)?.fields ?? [];
}

// ─── Widget Config Type ────────────────────────────────────────────────────────

export type WidgetType = "stat" | "chart" | "table" | "list";
export type ChartType  = "bar" | "line" | "pie" | "doughnut";
export type AggType    = "count" | "sum" | "avg";

export interface WidgetFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains";
  value: unknown;
}

export interface WidgetConfig {
  source:         string;
  filters?:       WidgetFilter[];
  sortField?:     string;
  sortDir?:       "asc" | "desc";
  limit?:         number;
  // stat
  aggregate?:     AggType;
  aggregateField?: string;
  prefix?:        string;
  suffix?:        string;
  icon?:          string;
  color?:         string;
  // chart
  chartType?:     ChartType;
  labelField?:    string;
  valueAggregate?: AggType;
  groupByField?:  string;
  // table
  columns?:       string[];
  // list
  listFields?:    string[];
}

// ─── Query Functions ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(source: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[source] ?? null;
}

function buildWhere(opts: { source: string; tenantId: string; filters?: WidgetFilter[] }): Record<string, unknown> {
  const src = DATA_SOURCES.find((s) => s.id === opts.source);
  const where: Record<string, unknown> = { tenantId: opts.tenantId };

  if (src?.softDelete) where.deletedAt = null;

  for (const f of (opts.filters ?? [])) {
    switch (f.operator) {
      case "eq":       where[f.field] = f.value; break;
      case "ne":       where[f.field] = { not: f.value }; break;
      case "gt":       where[f.field] = { gt: f.value }; break;
      case "lt":       where[f.field] = { lt: f.value }; break;
      case "gte":      where[f.field] = { gte: f.value }; break;
      case "lte":      where[f.field] = { lte: f.value }; break;
      case "contains": where[f.field] = { contains: f.value }; break;
    }
  }

  return where;
}

export async function queryData(opts: {
  source: string;
  tenantId: string;
  filters?: WidgetFilter[];
  columns?: string[];
  sortField?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
}): Promise<Record<string, unknown>[]> {
  const model = getModel(opts.source);
  if (!model) return [];

  const where    = buildWhere({ source: opts.source, tenantId: opts.tenantId, filters: opts.filters });
  const orderBy  = opts.sortField ? { [opts.sortField]: opts.sortDir ?? "desc" } : { createdAt: "desc" };
  const take     = Math.min(opts.limit ?? 50, 200);

  const select = opts.columns?.length
    ? Object.fromEntries([...opts.columns, "id"].map((c) => [c, true]))
    : undefined;

  return model.findMany({ where, orderBy, take, ...(select ? { select } : {}) }) as Promise<Record<string, unknown>[]>;
}

export async function aggregateData(opts: {
  source: string;
  tenantId: string;
  filters?: WidgetFilter[];
  aggregate: AggType;
  aggregateField?: string;
}): Promise<number> {
  const model = getModel(opts.source);
  if (!model) return 0;

  const where = buildWhere({ source: opts.source, tenantId: opts.tenantId, filters: opts.filters });

  if (opts.aggregate === "count") {
    return model.count({ where }) as Promise<number>;
  }

  if (!opts.aggregateField) return 0;

  if (opts.aggregate === "sum") {
    const r = await model.aggregate({ where, _sum: { [opts.aggregateField]: true } }) as Record<string, Record<string, number>>;
    return r._sum?.[opts.aggregateField] ?? 0;
  }

  if (opts.aggregate === "avg") {
    const r = await model.aggregate({ where, _avg: { [opts.aggregateField]: true } }) as Record<string, Record<string, number>>;
    return r._avg?.[opts.aggregateField] ?? 0;
  }

  return 0;
}

export async function groupByData(opts: {
  source: string;
  tenantId: string;
  filters?: WidgetFilter[];
  groupByField: string;
  limit?: number;
}): Promise<Array<{ label: string; value: number }>> {
  const model = getModel(opts.source);
  if (!model) return [];

  const where = buildWhere({ source: opts.source, tenantId: opts.tenantId, filters: opts.filters });

  const results = await model.groupBy({
    by: [opts.groupByField],
    where,
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: opts.limit ?? 10,
  }) as Array<Record<string, unknown>>;

  return results.map((r) => ({
    label: String(r[opts.groupByField] ?? "—"),
    value: (r._count as Record<string, number>)._all ?? 0,
  }));
}
