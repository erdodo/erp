import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PIPELINE_STAGES, getInteractionType } from "@/lib/crm-types";

export default async function CrmDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId!;

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, newThisMonth, byStageRaw, wonThisMonth, lostThisMonth, recentInteractions, topCustomers] =
    await Promise.all([
      prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      prisma.customer.count({ where: { tenantId, deletedAt: null, createdAt: { gte: start } } }),
      prisma.customer.groupBy({
        by:    ["pipelineStage"],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.customer.count({ where: { tenantId, deletedAt: null, pipelineStage: "won",  updatedAt: { gte: start } } }),
      prisma.customer.count({ where: { tenantId, deletedAt: null, pipelineStage: "lost", updatedAt: { gte: start } } }),
      prisma.customerInteraction.findMany({
        where:   { customer: { tenantId, deletedAt: null }, deletedAt: null },
        orderBy: { date: "desc" },
        take:    8,
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.customer.findMany({
        where:   { tenantId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take:    5,
        select:  { id: true, name: true, type: true, pipelineStage: true, city: true, email: true, phone: true },
      }),
    ]);

  const byStage = Object.fromEntries(byStageRaw.map((r) => [r.pipelineStage, r._count._all]));
  const activeStages = PIPELINE_STAGES.filter((s) => s.id !== "won" && s.id !== "lost");
  const activeCount  = activeStages.reduce((s, st) => s + (byStage[st.id] ?? 0), 0);
  const winRate = wonThisMonth + lostThisMonth > 0
    ? Math.round((wonThisMonth / (wonThisMonth + lostThisMonth)) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="pi-users"       label="Toplam Müşteri"  value={total}         color="#6366f1" />
        <StatCard icon="pi-user-plus"   label="Bu Ay Yeni"      value={newThisMonth}  color="#10b981" />
        <StatCard icon="pi-list"        label="Aktif Pipeline"  value={activeCount}   color="#f59e0b" />
        <StatCard icon="pi-percentage"  label="Kazanma Oranı"   value={`%${winRate}`} color="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Pipeline Durumu</h2>
            <Link href="/dashboard/crm/pipeline" className="text-sm text-primary hover:underline"
              style={{ color: "var(--color-primary)" }}>
              Kanban Görünüm →
            </Link>
          </div>
          <div className="space-y-2.5">
            {PIPELINE_STAGES.map((stage) => {
              const count = byStage[stage.id] ?? 0;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={stage.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${stage.bg}`}>
                        <i className={`pi ${stage.icon} text-xs`} />{stage.label}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Win/Loss this month */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-500">{wonThisMonth}</p>
              <p className="text-xs text-slate-400">Bu ay kazanıldı</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{lostThisMonth}</p>
              <p className="text-xs text-slate-400">Bu ay kaybedildi</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>%{winRate}</p>
              <p className="text-xs text-slate-400">Kazanma oranı</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Son Aktiviteler</h2>
          {recentInteractions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Henüz aktivite yok</p>
          ) : (
            <ul className="space-y-3">
              {recentInteractions.map((item) => {
                const typeCfg = getInteractionType(item.type);
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${typeCfg.color}20` }}>
                      <i className={`pi ${typeCfg.icon} text-xs`} style={{ color: typeCfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{item.subject}</p>
                      <Link href={`/dashboard/crm/customers/${item.customer.id}`}
                        className="text-xs text-slate-400 hover:text-primary truncate block"
                        style={{ color: undefined }}>
                        {item.customer.name}
                      </Link>
                    </div>
                    <span className="text-xs text-slate-300 shrink-0 mt-0.5">
                      {new Date(item.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Customers */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Son Müşteriler</h2>
          <Link href="/dashboard/crm/customers" className="text-sm hover:underline"
            style={{ color: "var(--color-primary)" }}>
            Tümünü gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-medium text-slate-500">Müşteri</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 hidden sm:table-cell">Şehir</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 hidden md:table-cell">İletişim</th>
                <th className="pb-2 font-medium text-slate-500">Aşama</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c) => {
                const stage = PIPELINE_STAGES.find((s) => s.id === c.pipelineStage) ?? PIPELINE_STAGES[0];
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2.5 pr-4">
                      <Link href={`/dashboard/crm/customers/${c.id}`} className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: "var(--color-primary)" }}>
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground group-hover:underline truncate max-w-40">{c.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 hidden sm:table-cell">{c.city ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-500 hidden md:table-cell">{c.email ?? c.phone ?? "—"}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stage.bg}`}>
                        {stage.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}>
        <i className={`pi ${icon} text-lg`} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
