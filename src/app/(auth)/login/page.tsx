"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const isAdminMode = searchParams.get("admin") === "true";

  const [email, setEmail] = useState(isAdminMode ? "superadmin@erp.local" : "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const urlError =
    errorParam === "inactive" ? "Hesabınız devre dışı. Yöneticinize başvurun." :
    errorParam === "CredentialsSignin" ? "E-posta veya şifre hatalı." : null;
  const error = formError ?? urlError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setFormError("Lütfen tüm alanları doldurun."); return; }
    setLoading(true);
    setFormError(null);

    try {
      await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      console.error("[LOGIN] Error:", err);
      setFormError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-primary)" }}
          >
            <i className="pi pi-sitemap text-white" />
          </div>
          <span className="text-xl font-bold">ERP Sistemi</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground">
          {isAdminMode ? "⚙️ Sistem Girişi" : "Hoş geldiniz"}
        </h2>
        <p className="text-slate-500 mt-1">Hesabınıza giriş yapın</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <i className="pi pi-exclamation-circle" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">E-posta</label>
          <div className="relative">
            <i className="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              autoComplete="email"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Şifre</label>
          <div className="relative">
            <i className="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              <i className={`pi ${showPass ? "pi-eye-slash" : "pi-eye"} text-sm`} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-500">Beni hatırla</span>
          </label>
          <button type="button" className="text-sm hover:underline" style={{ color: "var(--color-primary)" }}>
            Şifremi unuttum
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "var(--color-primary)" }}
        >
          {loading ? (
            <><i className="pi pi-spin pi-spinner" /> Giriş yapılıyor...</>
          ) : (
            <><i className="pi pi-sign-in" /> Giriş Yap</>
          )}
        </button>
      </form>

      {/* Register link */}
      {!isAdminMode && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
            Ücretsiz kaydolun
          </Link>
        </p>
      )}

      {/* Demo credentials hint */}
      {isAdminMode && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <strong>Demo:</strong> superadmin@erp.local / SuperAdmin123!
        </div>
      )}
    </div>
  );
}
