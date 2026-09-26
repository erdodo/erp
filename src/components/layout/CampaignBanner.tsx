"use client";

import { useEffect, useState } from "react";

type Plan = {
  campaignActive: boolean;
  campaignEndLabel: string;
  subscribed: boolean;
  readOnly: boolean;
  contactEmail: string;
};

const DISMISS_KEY = "campaign-banner-dismissed";

// Lansman kampanyası bandı: kampanya süresince bilgi, süre dolunca salt okunur uyarısı
export function CampaignBanner() {
  const [plan, setPlan] = useState<Plan | null>(null);
  // Sunucuda localStorage yok; bant zaten plan gelene kadar çizilmediği için uyumsuzluk oluşmaz
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetch("/api/tenant/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Plan | null) => d && setPlan(d))
      .catch(() => {});
  }, []);

  if (!plan || plan.subscribed) return null;

  if (plan.readOnly) {
    return (
      <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
        Ücretsiz kampanya süresi {plan.campaignEndLabel} tarihinde sona erdi. Verileriniz korunuyor ancak hesabınız salt okunur.{" "}
        <a href={`mailto:${plan.contactEmail}?subject=ERP%20abonelik`} className="underline underline-offset-2">
          Aboneliğe geçmek için iletişime geçin
        </a>
      </div>
    );
  }

  if (!plan.campaignActive || dismissed) return null;

  return (
    <div className="relative bg-primary px-10 py-2 text-center text-sm font-medium text-white">
      🎉 Lansman kampanyası: {plan.campaignEndLabel} tarihine kadar tüm modüller ücretsiz ve sınırsız.
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1.5 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
