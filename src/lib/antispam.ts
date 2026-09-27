// Kayıt formu için basit bot/spam koruması (harici servis gerektirmez):
// 1) Gizli tuzak alanı: insanlar görmez, botlar doldurur.
// 2) Asgari doldurma süresi: form açıldıktan birkaç saniye geçmeden gönderilen kayıtlar reddedilir.
// 3) Ani kayıt dalgası sınırı: son 10 dakikada çok fazla yeni hesap açıldıysa kayıt geçici olarak durur.

export const HONEYPOT_FIELD = "website";
const MIN_FILL_MS = 3000;
export const BURST_WINDOW_MS = 10 * 60 * 1000;
export const BURST_MAX = 20;

export interface SpamFields {
  website?: unknown;
  startedAt?: unknown;
}

/** Şüpheli kayıtta kullanıcıya gösterilecek mesajı, temizse null döndürür. */
export function spamCheck(input: SpamFields): string | null {
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return "Kayıt tamamlanamadı.";
  }
  const started = Number(input.startedAt);
  if (!started || !Number.isFinite(started)) {
    return "Sayfayı yenileyip tekrar deneyin.";
  }
  if (Date.now() - started < MIN_FILL_MS) {
    return "Form çok hızlı gönderildi, lütfen birkaç saniye sonra tekrar deneyin.";
  }
  return null;
}

/** Son 10 dakikada açılan hesap sayısı sınırı aştıysa true. */
export function isSignupBurst(recentCount: number): boolean {
  return recentCount >= BURST_MAX;
}

export const BURST_MESSAGE = "Şu anda çok fazla kayıt isteği var, lütfen birkaç dakika sonra tekrar deneyin.";

export function burstSince(): Date {
  return new Date(Date.now() - BURST_WINDOW_MS);
}
