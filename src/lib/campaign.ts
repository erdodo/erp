// Lansman kampanyası: kayıt olan her firma bu tarihe kadar tüm modülleri sınırsız kullanır.
// Tarih geçtikten sonra aboneliği olmayan firmalar salt okunur olur (veriler görünür, değişiklik yapılamaz).
//
// Aboneliği olan firmalar: Vercel ortam değişkeni SUBSCRIBED_TENANTS — virgülle ayrılmış tenant id veya slug listesi.
// Bu dosya middleware (proxy.ts) tarafından da kullanıldığı için Prisma import ETMEZ.

export const CAMPAIGN_END = new Date("2027-01-31T23:59:59+03:00");
export const CAMPAIGN_END_LABEL = "31 Ocak 2027";
export const CONTACT_EMAIL = "erdoganyesil3@gmail.com";

export function isCampaignActive(now: Date = new Date()): boolean {
  return now.getTime() <= CAMPAIGN_END.getTime();
}

function subscribedTenants(): Set<string> {
  return new Set(
    (process.env.SUBSCRIBED_TENANTS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isTenantSubscribed(...keys: (string | null | undefined)[]): boolean {
  const list = subscribedTenants();
  return keys.some((k) => !!k && list.has(k));
}

/** Kampanya bittiyse ve firmanın aboneliği yoksa salt okunur. */
export function isTenantReadOnly(...keys: (string | null | undefined)[]): boolean {
  if (isCampaignActive()) return false;
  return !isTenantSubscribed(...keys);
}
