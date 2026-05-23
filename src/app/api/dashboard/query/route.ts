import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryData, aggregateData, groupByData } from "@/lib/dashboard-data";
import { z } from "zod";

const QuerySchema = z.object({
  source:          z.string().min(1),
  queryType:       z.enum(["rows", "aggregate", "groupBy"]).default("rows"),
  filters:         z.array(z.object({
    field:    z.string(),
    operator: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "contains"]),
    value:    z.unknown(),
  })).optional(),
  columns:         z.array(z.string()).optional(),
  sortField:       z.string().optional(),
  sortDir:         z.enum(["asc", "desc"]).optional(),
  limit:           z.number().int().min(1).max(200).optional(),
  aggregate:       z.enum(["count", "sum", "avg"]).optional(),
  aggregateField:  z.string().optional(),
  groupByField:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const opts = { ...parsed.data, tenantId };

  try {
    if (opts.queryType === "aggregate") {
      const value = await aggregateData({
        source:          opts.source,
        tenantId,
        filters:         opts.filters,
        aggregate:       opts.aggregate ?? "count",
        aggregateField:  opts.aggregateField,
      });
      return NextResponse.json({ value });
    }

    if (opts.queryType === "groupBy") {
      if (!opts.groupByField) return NextResponse.json({ error: "groupByField gerekli" }, { status: 400 });
      const rows = await groupByData({
        source:       opts.source,
        tenantId,
        filters:      opts.filters,
        groupByField: opts.groupByField,
        limit:        opts.limit,
      });
      return NextResponse.json({ rows });
    }

    const rows = await queryData({
      source:    opts.source,
      tenantId,
      filters:   opts.filters,
      columns:   opts.columns,
      sortField: opts.sortField,
      sortDir:   opts.sortDir,
      limit:     opts.limit,
    });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[dashboard/query]", err);
    return NextResponse.json({ error: "Sorgu hatası" }, { status: 500 });
  }
}
