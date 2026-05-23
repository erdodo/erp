"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  id: string; title: string; desc: string; icon: string; route: string; color: string;
}

const STEPS: Step[] = [
  { id: "branding",   title: "Marka Ayarları",       desc: "Logo, renkler ve şirket bilgilerini tanımlayın",        icon: "pi-palette",       route: "/dashboard/admin/settings",      color: "#6366f1" },
  { id: "users",      title: "Kullanıcı & Roller",    desc: "Ekip üyelerini ekleyin ve yetki seviyelerini belirleyin", icon: "pi-users",         route: "/dashboard/admin/users",         color: "#0ea5e9" },
  { id: "roles",      title: "Roller & Yetkiler",     desc: "Departman ve rol yapısını oluşturun",                   icon: "pi-shield",        route: "/dashboard/admin/roles",         color: "#10b981" },
  { id: "customers",  title: "İlk Müşteri",           desc: "CRM'e ilk müşterinizi ekleyin",                         icon: "pi-user-plus",     route: "/dashboard/crm/customers/new",   color: "#f59e0b" },
  { id: "products",   title: "Ürün / Hizmet",         desc: "Satışlarınızda kullanılacak ürünleri tanımlayın",        icon: "pi-box",           route: "/dashboard/sales/products",      color: "#ef4444" },
  { id: "invoice",    title: "İlk Satış Siparişi",   desc: "Deneme amaçlı ilk satış siparişinizi oluşturun",        icon: "pi-file",          route: "/dashboard/sales/orders/new",    color: "#8b5cf6" },
  { id: "employees",  title: "Çalışan Ekle",          desc: "İK modülü için en az bir çalışan ekleyin",              icon: "pi-id-card",       route: "/dashboard/employees",           color: "#ec4899" },
  { id: "apikey",     title: "API Anahtarı",          desc: "Entegrasyon için güvenli bir API anahtarı oluşturun",   icon: "pi-key",           route: "/dashboard/api-keys",            color: "#14b8a6" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("erp_onboarding") ?? "[]") as string[];
      setCompleted(stored.length > 0 ? new Set(stored) : new Set());
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("erp_onboarding", JSON.stringify([...next]));
      return next;
    });
  }

  function navigate(step: Step) {
    toggle(step.id);
    router.push(step.route);
  }

  const pct = mounted ? Math.round((completed.size / STEPS.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-6 pt-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-sparkles text-white text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sistemi Kurmaya Başlayın</h1>
        <p className="text-slate-400">Aşağıdaki adımları tamamlayarak ERP&apos;nizi hazır hale getirin</p>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Genel İlerleme</span>
          <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }} suppressHydrationWarning>{mounted ? completed.size : 0}/{STEPS.length} tamamlandı</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
        </div>
        {pct === 100 && (
          <div className="mt-3 text-center space-y-2">
            <p className="text-emerald-600 font-medium text-sm"><i className="pi pi-check-circle mr-1.5" />Tüm adımlar tamamlandı!</p>
            <button
              onClick={() => {
                void fetch("/api/tenant/onboarding", { method: "POST" }).then(() => router.push("/dashboard"));
              }}
              className="px-5 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: "var(--color-primary)" }}
            >
              <i className="pi pi-check mr-1.5" />Kurulumu Tamamla &amp; Dashboard&apos;a Git
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const done = completed.has(step.id);
          return (
            <div key={step.id} className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 transition hover:shadow-sm ${done ? "border-emerald-200 dark:border-emerald-800" : "border-border"}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: done ? "#ecfdf5" : `${step.color}15` }}>
                  {done ? <i className="pi pi-check text-emerald-600 text-lg" /> : <i className={`pi ${step.icon} text-lg`} style={{ color: step.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0" style={{ background: done ? "#ecfdf5" : `${step.color}20`, color: done ? "#059669" : step.color }}>{idx + 1}</span>
                    <p className={`font-semibold text-sm ${done ? "line-through text-slate-400" : "text-foreground"}`}>{step.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 pl-7">{step.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(step.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-400"}`}>
                    {done && <i className="pi pi-check text-white text-xs" />}
                  </button>
                  {!done && (
                    <button onClick={() => navigate(step)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: step.color }}>
                      Git <i className="pi pi-arrow-right text-xs ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-5 text-center">
        <p className="text-sm text-slate-500">Yardıma ihtiyacınız varsa{" "}<a href="/dashboard/help" className="font-medium underline" style={{ color: "var(--color-primary)" }}>Yardım Merkezi</a>&apos;ni ziyaret edin.</p>
      </div>
    </div>
  );
}
