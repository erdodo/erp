"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", companyName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  function setField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.email || !form.password || !form.companyName) {
      setError("Lütfen tüm alanları doldurun."); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor."); return;
    }
    if (form.password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır."); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          companyName: form.companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kayıt başarısız."); setLoading(false); return; }

      // Auto sign-in
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(`/register/setup?tenantId=${data.tenantId}`);
      } else {
        setError("Giriş başarısız. Lütfen tekrar deneyin.");
        setLoading(false);
      }
    } catch {
      setError("Bir bağlantı hatası oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  const fields = [
    { key: "name" as const, label: "Ad Soyad", placeholder: "Ahmet Yılmaz", icon: "pi-user", type: "text" },
    { key: "email" as const, label: "E-posta", placeholder: "ahmet@sirket.com", icon: "pi-envelope", type: "email" },
    { key: "companyName" as const, label: "Şirket Adı", placeholder: "Yılmaz A.Ş.", icon: "pi-building", type: "text" },
  ];

  return (
    <div>
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
        <h2 className="text-3xl font-bold text-foreground">Hesap oluşturun</h2>
        <p className="text-slate-500 mt-1">Ücretsiz kaydolun, hemen başlayın</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <i className="pi pi-exclamation-circle" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
            <div className="relative">
              <i className={`pi ${f.icon} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm`} />
              <input
                type={f.type}
                value={form[f.key]}
                onChange={setField(f.key)}
                placeholder={f.placeholder}
                autoComplete={f.key === "email" ? "email" : "off"}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              />
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Şifre</label>
          <div className="relative">
            <i className="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={setField("password")}
              placeholder="En az 8 karakter"
              autoComplete="new-password"
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

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Şifre Tekrar</label>
          <div className="relative">
            <i className="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type={showPass ? "text" : "password"}
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
              placeholder="Şifreyi tekrar girin"
              autoComplete="new-password"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          style={{ background: "var(--color-primary)" }}
        >
          {loading ? (
            <><i className="pi pi-spin pi-spinner" /> Hesap oluşturuluyor...</>
          ) : (
            <><i className="pi pi-user-plus" /> Kaydol ve Başla</>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          Kaydolarak{" "}
          <span className="underline cursor-pointer" style={{ color: "var(--color-primary)" }}>Kullanım Koşulları</span>
          {" "}ve{" "}
          <span className="underline cursor-pointer" style={{ color: "var(--color-primary)" }}>Gizlilik Politikası</span>
          &apos;nı kabul etmiş olursunuz.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
