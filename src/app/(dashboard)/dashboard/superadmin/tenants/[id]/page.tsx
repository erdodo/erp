import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantEditForm } from "./TenantEditForm";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, modules: true } },
      modules: { where: { isActive: true }, select: { module: true } },
    },
  });

  if (!tenant) notFound();

  const recentUsers = await prisma.user.findMany({
    where: { tenantId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, isActive: true, isAdmin: true, createdAt: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/superadmin/tenants" className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-slate-100 transition text-slate-500">
          <i className="pi pi-arrow-left text-sm" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
          <p className="text-slate-500 text-sm font-mono">{tenant.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/superadmin/tenants/${id}/modules`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-slate-50 transition text-foreground">
            <i className="pi pi-th-large text-xs" /> Modüller ({tenant._count.modules})
          </Link>
          <Link href={`/dashboard/superadmin/tenants/${id}/quotas`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-slate-50 transition text-foreground">
            <i className="pi pi-chart-bar text-xs" /> Kotalar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Kullanıcı", value: tenant._count.users, icon: "pi-users" },
          { label: "Aktif Modül", value: tenant._count.modules, icon: "pi-th-large" },
          { label: "Durum", value: tenant.isActive ? "Aktif" : "Pasif", icon: "pi-circle" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 text-center">
            <i className={`pi ${s.icon} text-xl mb-1`} style={{ color: "var(--color-primary)" }} />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TenantEditForm tenant={tenant} />

        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Son Kullanıcılar</h2>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.isAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Admin</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">Kullanıcı yok</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
