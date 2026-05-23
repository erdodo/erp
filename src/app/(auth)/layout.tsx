export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <i className="pi pi-sitemap text-white text-xl" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ERP Sistemi</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            İşletmenizi tek platformdan yönetin
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Üretim, satış, finans, İK ve daha fazlası — tüm modüller entegre, güvenli ve hızlı.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: "pi-users", label: "Çok Kullanıcılı" },
              { icon: "pi-shield", label: "Rol Tabanlı Yetki" },
              { icon: "pi-globe", label: "Türkçe Arayüz" },
              { icon: "pi-cloud", label: "Gerçek Zamanlı" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
                <i className={`pi ${f.icon} text-white/90`} />
                <span className="text-sm text-white/90">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/50 text-sm">© {new Date().getFullYear()} ERP Sistemi. Tüm hakları saklıdır.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
