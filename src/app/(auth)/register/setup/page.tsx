"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STEPS = [
  { key: "permissions", label: "Yetkiler hazırlanıyor" },
  { key: "rolePermissions", label: "Roller atanıyor" },
  { key: "tenantModules", label: "Modüller yapılandırılıyor" },
  { key: "quotas", label: "Kotalar ekleniyor" },
  { key: "mockData", label: "Örnek veriler yükleniyor" },
];

type StepKey = (typeof STEPS)[number]["key"];

type StepStatus = "pending" | "running" | "done" | "error";

export default function RegisterSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [statuses, setStatuses] = useState<StepStatus[]>(Array(STEPS.length).fill("pending"));
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);

  const percent = useMemo(() => Math.round((currentStep / STEPS.length) * 100), [currentStep]);

  useEffect(() => {
    if (!tenantId || started) return;
    setStarted(true);
    void runSetup();
  }, [tenantId, started]);

  async function runSetup() {
    if (!tenantId) {
      setError("Tenant ID bulunamadı.");
      return;
    }

    for (let index = 0; index < STEPS.length; index += 1) {
      const step = STEPS[index];
      setCurrentStep(index);
      setStatuses((prev) => {
        const next = [...prev];
        next[index] = "running";
        return next;
      });

      const res = await fetch("/api/auth/register/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, step: step.key }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatuses((prev) => {
          const next = [...prev];
          next[index] = "error";
          return next;
        });
        setError(data.error ?? "Bir hata oluştu.");
        return;
      }

      setStatuses((prev) => {
        const next = [...prev];
        next[index] = "done";
        return next;
      });
    }

    setCompleted(true);
    setCurrentStep(STEPS.length);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Hesabınız hazırlandı</h1>
          <p className="mt-2 text-sm text-slate-500">
            Şimdi yeni hesabınıza ait ön ayarlar ve örnek veriler hazırlanıyor. Bu ekranda adım adım ilerleme göreceksiniz.
          </p>
        </div>

        <div className="mb-6">
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500 transition-all"
              style={{ width: `${Math.min(100, percent + 1)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
            <span>{completed ? "Kurulum tamamlandı." : `İlerleme: ${Math.max(0, percent)}%`}</span>
            <span>{currentStep}/{STEPS.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const status = statuses[index];
            const icon = status === "done" ? "pi-check" : status === "running" ? "pi-spin pi-spinner" : status === "error" ? "pi-times" : "pi-circle";
            const color = status === "done" ? "text-emerald-600" : status === "running" ? "text-amber-500" : status === "error" ? "text-red-600" : "text-slate-400";

            return (
              <div key={step.key} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-4">
                <i className={`pi ${icon} ${color}`} />
                <div>
                  <p className="font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-slate-500">{status === "done" ? "Tamamlandı" : status === "running" ? "Devam ediyor" : status === "error" ? "Hata oluştu" : "Beklemede"}</p>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Kurulum sırasında bir hata oluştu</p>
            <p>{error}</p>
          </div>
        )}

        {!error && completed && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Hazırlık tamamlandı. Kısa süre sonra dashboard'a yönlendirileceksiniz.
          </div>
        )}
      </div>
    </div>
  );
}
