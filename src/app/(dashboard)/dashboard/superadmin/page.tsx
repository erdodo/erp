import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  const [tenantCount, activeTenants, userCount, auditCount] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.tenant.count({ where: { deletedAt: null, isActive: true } }),
    prisma.user.count({ where: { deletedAt: null, isSuperAdmin: false } }),
    prisma.auditLog.count(),
  ]);

  const recentTenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { _count: { select: { users: true } } },
  });

  const recentLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { name: true } }, tenant: { select: { name: true } } },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-shield text-amber-500" /> SuperAdmin Paneli
          </h1>
          <p className="text-slate-500 mt-0.5">Tüm tenantları ve sistemi yönetin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam Tenant", value: tenantCount, icon: "pi-building", color: "#2563eb" },
          { label: "Aktif Tenant", value: activeTenants, icon: "pi-check-circle", color: "#16a34a" },
          { label: "Kullanıcılar", value: userCount, icon: "pi-users", color: "#7c3aed" },
          { label: "Denetim Kaydı", value: auditCount, icon: "pi-history", color: "#ea580c" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: s.color }}>
              <i className={`pi ${s.icon} text-sm`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { href: "/dashboard/superadmin/tenants", icon: "pi-building", label: "Tenantlar" },
          { href: "/dashboard/superadmin/users", icon: "pi-users", label: "Kullanıcılar" },
          { href: "/dashboard/superadmin/audit-log", icon: "pi-history", label: "Denetim Kaydı" },
          { href: "/dashboard/superadmin/database", icon: "pi-database", label: "Veritabanı" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-border bg-white dark:bg-slate-900 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <i className={`pi ${item.icon}`} />
            </div>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent tenants */}
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <i className="pi pi-building text-amber-500" /> Son Tenantlar
            </h2>
            <Link href="/dashboard/superadmin/tenants" className="text-xs text-amber-600 hover:underline">Tümünü gör</Link>
          </div>
          <div className="divide-y divide-border">
            {recentTenants.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/superadmin/tenants/${t.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.slug} • {t._count.users} kullanıcı</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {t.isActive ? "Aktif" : "Pasif"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent audit logs */}
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <i className="pi pi-history text-amber-500" /> Son Aktiviteler
            </h2>
            <Link href="/dashboard/superadmin/audit-log" className="text-xs text-amber-600 hover:underline">Tümünü gör</Link>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.user?.name ?? "—"}</span>
                    {" · "}
                    <span className="text-amber-600 font-medium">{log.action}</span>
                    {" · "}
                    <span className="text-slate-500">{log.module}</span>
                  </p>
                  <p className="text-xs text-slate-400">{log.tenant?.name ?? "—"}</p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
