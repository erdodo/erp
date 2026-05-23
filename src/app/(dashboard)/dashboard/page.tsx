import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;

  let activeModuleCount = 0;
  let tenantName = "ERP Sistemi";

  if (user.tenantId) {
    const [modules, tenant] = await Promise.all([
      prisma.tenantModule.count({ where: { tenantId: user.tenantId, isActive: true } }),
      prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
    ]);
    activeModuleCount = modules;
    tenantName = tenant?.name ?? tenantName;
  }

  const initialLayouts = await prisma.dashboardLayout.findMany({
    where:   { userId: user.id!, tenantId: user.tenantId! },
    include: { widgets: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
    orderBy: { createdAt: "asc" },
  });

  const greeting = getGreeting();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user.name?.split(" ")[0] ?? "Kullanıcı"} 👋
          </h1>
          <p className="text-slate-500 mt-0.5">{tenantName} — Hoş geldiniz</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
          <i className="pi pi-calendar" />
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* SuperAdmin banner */}
      {user.isSuperAdmin && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-3">
          <i className="pi pi-shield text-amber-600 text-xl" />
          <div>
            <p className="font-semibold text-amber-800">SuperAdmin Modu</p>
            <p className="text-sm text-amber-700">Tüm tenant&apos;ları ve sistem ayarlarını yönetebilirsiniz.</p>
          </div>
          <a
            href="/dashboard/superadmin"
            className="ml-auto px-3 py-1.5 text-sm rounded-lg text-white font-medium"
            style={{ background: "var(--color-primary)" }}
          >
            SuperAdmin Paneli
          </a>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="pi-th-large" label="Aktif Modül" value={activeModuleCount} color="var(--color-primary)" />
        <StatCard icon="pi-users" label="Kullanıcılar" value="—" color="#16a34a" />
        <StatCard icon="pi-bell" label="Bildirimler" value="—" color="#ea580c" />
        <StatCard icon="pi-chart-line" label="Bu Ay" value="—" color="#7c3aed" />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <i className="pi pi-bolt text-amber-500" /> Hızlı Erişim
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/crm", icon: "pi-users", label: "CRM", desc: "Müşteri yönetimi" },
            { href: "/dashboard/sales", icon: "pi-shopping-cart", label: "Satış", desc: "Sipariş takibi" },
            { href: "/dashboard/projects", icon: "pi-briefcase", label: "Proje", desc: "Proje yönetimi" },
            { href: "/dashboard/tasks", icon: "pi-check", label: "Görev", desc: "Görev listesi" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-surface transition-colors group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "var(--color-primary)" }}
              >
                <i className={`pi ${item.icon} text-sm`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                <p className="text-xs text-slate-400 truncate">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Custom Widget Dashboard */}
      <div>
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <i className="pi pi-th-large text-slate-400" /> Widget Panosu
        </h2>
        <DashboardGrid initialLayouts={initialLayouts} />
      </div>

      {/* Modules not activated notice */}
      {activeModuleCount === 0 && !user.isSuperAdmin && (
        <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-8 text-center">
          <i className="pi pi-box text-4xl text-slate-300 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Henüz aktif modül yok</h3>
          <p className="text-sm text-slate-500">
            Yöneticinizden modülleri aktif etmesini isteyin veya admin panelinizden modül ayarlarını yapın.
          </p>
          {user.isAdmin && (
            <a
              href="/dashboard/admin/settings"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: "var(--color-primary)" }}
            >
              <i className="pi pi-cog" /> Modül Ayarları
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: color }}>
        <i className={`pi ${icon} text-sm`} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}
