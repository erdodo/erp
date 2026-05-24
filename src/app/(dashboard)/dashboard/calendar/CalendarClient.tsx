"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import type { CalendarEvent, CalendarFilter } from "@/lib/calendar-types";

const FILTER_COLORS: Record<CalendarFilter, string> = {
  sales:         "#16a34a",
  subscriptions: "#0891b2",
  rent:          "#65a30d",
  production:    "#dc2626",
  projects:      "#4f46e5",
  leave:         "#be123c",
};

const FILTER_ICONS: Record<CalendarFilter, string> = {
  sales:         "pi-shopping-cart",
  subscriptions: "pi-credit-card",
  rent:          "pi-building",
  production:    "pi-cog",
  projects:      "pi-briefcase",
  leave:         "pi-calendar-times",
};

const ALL_FILTERS: CalendarFilter[] = ["sales", "subscriptions", "rent", "production", "projects", "leave"];

export function CalendarClient() {
  const t = useTranslations("calendar");
  const [events, setEvents]       = useState<CalendarEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState<Set<CalendarFilter>>(new Set(ALL_FILTERS));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, subsRes, rentRes, prodRes, projRes, leaveRes] = await Promise.all([
        fetch("/api/modules/sales/orders?limit=200"),
        fetch("/api/modules/subscriptions?limit=200"),
        fetch("/api/modules/rent"),
        fetch("/api/modules/production/orders?limit=200"),
        fetch("/api/modules/projects"),
        fetch("/api/modules/hr/leave?limit=200"),
      ]);

      const [salesData, subsData, rentData, prodData, projData, leaveData] = await Promise.all([
        salesRes.ok  ? salesRes.json()  : {},
        subsRes.ok   ? subsRes.json()   : {},
        rentRes.ok   ? rentRes.json()   : {},
        prodRes.ok   ? prodRes.json()   : {},
        projRes.ok   ? projRes.json()   : {},
        leaveRes.ok  ? leaveRes.json()  : {},
      ]);

      const all: CalendarEvent[] = [];

      // Sales orders — createdAt / deliveryDate
      (salesData?.orders ?? []).forEach((o: any) => {
        const start = o.createdAt ? new Date(o.createdAt) : null;
        const end   = o.deliveryDate ? new Date(o.deliveryDate) : start;
        if (!start) return;
        all.push({ id: `sale-${o.id}`, title: `#${o.saleNo ?? o.id} ${o.customer?.name ?? ""}`.trim(), start, end: end!, type: "sales", color: FILTER_COLORS.sales, url: `/dashboard/sales/orders/${o.id}` });
      });

      // Subscriptions — startDate / nextRenewal or endDate
      (subsData?.subscriptions ?? []).forEach((s: any) => {
        const start = s.startDate ? new Date(s.startDate) : null;
        const end   = s.nextRenewal ? new Date(s.nextRenewal) : s.endDate ? new Date(s.endDate) : start;
        if (!start) return;
        all.push({ id: `sub-${s.id}`, title: s.name ?? s.customer?.name ?? s.id, start, end: end!, type: "subscriptions", color: FILTER_COLORS.subscriptions, url: `/dashboard/subscriptions` });
      });

      // Properties/Rent — no specific date, skip if no date field
      (rentData?.properties ?? rentData?.rentals ?? []).forEach((r: any) => {
        const start = r.createdAt ? new Date(r.createdAt) : null;
        if (!start) return;
        all.push({ id: `rent-${r.id}`, title: r.name ?? r.address ?? r.id, start, end: start, type: "rent", color: FILTER_COLORS.rent, url: `/dashboard/properties/${r.id}` });
      });

      // Production orders — plannedStart / plannedEnd
      (prodData?.orders ?? []).forEach((p: any) => {
        const start = p.plannedStart ? new Date(p.plannedStart) : p.createdAt ? new Date(p.createdAt) : null;
        const end   = p.plannedEnd   ? new Date(p.plannedEnd)   : start;
        if (!start) return;
        all.push({ id: `prod-${p.id}`, title: p.productName ?? p.id, start, end: end!, type: "production", color: FILTER_COLORS.production, url: `/dashboard/production` });
      });

      // Projects — startDate / endDate
      (projData?.projects ?? []).forEach((p: any) => {
        const start = p.startDate ? new Date(p.startDate) : p.createdAt ? new Date(p.createdAt) : null;
        const end   = p.endDate   ? new Date(p.endDate)   : start;
        if (!start) return;
        all.push({ id: `proj-${p.id}`, title: p.name ?? p.id, start, end: end!, type: "projects", color: FILTER_COLORS.projects, url: `/dashboard/projects` });
      });

      // Leave requests — startDate / endDate
      (leaveData?.requests ?? []).forEach((l: any) => {
        const start = l.startDate ? new Date(l.startDate) : null;
        const end   = l.endDate   ? new Date(l.endDate)   : start;
        if (!start) return;
        all.push({ id: `leave-${l.id}`, title: l.employee?.name ?? l.id, start, end: end!, type: "leave", color: FILTER_COLORS.leave, url: `/dashboard/leave` });
      });

      setEvents(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Calendar grid helpers
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart    = new Date(year, month, 1);
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const startWeekDay  = monthStart.getDay(); // 0=Sun

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startWeekDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  while (week.length && week.length < 7) week.push(null);
  if (week.length) weeks.push(week);

  function eventsForDay(day: number) {
    const cellDate = new Date(year, month, day);
    const cellEnd  = new Date(year, month, day, 23, 59, 59);
    return events.filter((e) =>
      filters.has(e.type) &&
      e.start <= cellEnd &&
      e.end   >= cellDate
    );
  }

  function toggleFilter(type: CalendarFilter) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }
  function goToday()   { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()); }

  const today     = new Date();
  const isToday   = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const monthLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-calendar text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">{t("title")}</h1>
            <p className="text-xs text-slate-400">{t("subtitle")}</p>
          </div>
        </div>
        <button
          onClick={goToday}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <i className="pi pi-calendar text-xs" /> {t("today")}
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilters(filters.size === ALL_FILTERS.length ? new Set() : new Set(ALL_FILTERS))}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
            filters.size === ALL_FILTERS.length
              ? "border-slate-400 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
              : "border-border text-slate-400 hover:border-slate-400"
          }`}
        >
          {t("filters.all")}
        </button>
        {ALL_FILTERS.map((type) => {
          const active = filters.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border"
              style={active
                ? { background: FILTER_COLORS[type] + "20", borderColor: FILTER_COLORS[type], color: FILTER_COLORS[type] }
                : { borderColor: "var(--color-border)", color: "#94a3b8" }
              }
            >
              <i className={`pi ${FILTER_ICONS[type]} text-[10px]`} />
              {t(`filters.${type}`)}
            </button>
          );
        })}
      </div>

      {/* Calendar card */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition">
            <i className="pi pi-chevron-left text-xs" />
          </button>
          <span className="font-bold text-foreground capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition">
            <i className="pi pi-chevron-right text-xs" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {dayKeys.map((dk) => (
            <div key={dk} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t(`days.${dk}`)}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {weeks.map((w, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-border/50">
                {w.map((day, di) => {
                  if (!day) return <div key={di} className="min-h-[90px] sm:min-h-[110px] bg-slate-50/50 dark:bg-slate-800/20" />;
                  const dayEvents = eventsForDay(day);
                  const selected  = selectedDay === day;
                  const todayDay  = isToday(day);
                  return (
                    <div
                      key={di}
                      onClick={() => setSelectedDay(selected ? null : day)}
                      className={`min-h-[90px] sm:min-h-[110px] p-1.5 cursor-pointer transition ${
                        selected
                          ? "bg-blue-50 dark:bg-blue-950/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {/* Day number */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                        todayDay
                          ? "text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`} style={todayDay ? { background: "var(--color-primary)" } : {}}>
                        {day}
                      </div>

                      {/* Events — show up to 2, then "+N more" */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <a
                            key={e.id}
                            href={e.url}
                            onClick={(ev) => ev.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] font-medium truncate rounded px-1 py-0.5 hover:opacity-80 transition"
                            style={{ background: e.color + "20", color: e.color, borderLeft: `2px solid ${e.color}` }}
                            title={e.title}
                          >
                            <span className="truncate hidden sm:block">{e.title}</span>
                            <span className="sm:hidden w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                          </a>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] font-semibold text-slate-400 px-1">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-800/50">
            <span className="font-bold text-sm text-foreground">
              {new Date(year, month, selectedDay).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-foreground transition">
              <i className="pi pi-times text-xs" />
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              <i className="pi pi-calendar text-3xl block mb-2 opacity-30" />
              {t("noEvents")}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {selectedDayEvents.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-600 transition">{e.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{t(`filters.${e.type}`)}</p>
                  </div>
                  <i className="pi pi-external-link text-xs text-slate-300 group-hover:text-blue-500 transition" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
