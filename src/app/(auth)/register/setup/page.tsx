"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const STEPS_CONFIG = [
  { key: "permissions", labelKey: "setup.permissions" },
  { key: "rolePermissions", labelKey: "setup.rolePermissions" },
  { key: "tenantModules", labelKey: "setup.tenantModules" },
  { key: "quotas", labelKey: "setup.quotas" },
  { key: "mockData", labelKey: "setup.mockData" },
];

type StepKey = (typeof STEPS_CONFIG)[number]["key"];

type StepStatus = "pending" | "running" | "done" | "error";

export default function RegisterSetupPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [statuses, setStatuses] = useState<StepStatus[]>(Array(STEPS_CONFIG.length).fill("pending"));
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);

  const percent = useMemo(() => Math.round((currentStep / STEPS_CONFIG.length) * 100), [currentStep]);

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

    for (let index = 0; index < STEPS_CONFIG.length; index += 1) {
      const step = STEPS_CONFIG[index];
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
    setCurrentStep(STEPS_CONFIG.length);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">{t("setup.accountReady")}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("setup.setupDescription")}
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
            <span>{completed ? t("setup.setupCompleted") : t("setup.progress", { percent: Math.max(0, percent) })}</span>
            <span>{currentStep}/{STEPS_CONFIG.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS_CONFIG.map((step, index) => {
            const status = statuses[index];
            const icon = status === "done" ? "pi-check" : status === "running" ? "pi-spin pi-spinner" : status === "error" ? "pi-times" : "pi-circle";
            const color = status === "done" ? "text-emerald-600" : status === "running" ? "text-amber-500" : status === "error" ? "text-red-600" : "text-slate-400";

            return (
              <div key={step.key} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-4">
                <i className={`pi ${icon} ${color}`} />
                <div>
                  <p className="font-medium text-foreground">{t(step.labelKey)}</p>
                  <p className="text-xs text-slate-500">
                    {status === "done" ? t("setup.completed") : status === "running" ? t("setup.inProgress") : status === "error" ? t("setup.error") : t("setup.pending")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{t("setup.setupError")}</p>
            <p>{error}</p>
          </div>
        )}

        {!error && completed && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {t("setup.readyDescription")}
          </div>
        )}
      </div>
    </div>
  );
}
