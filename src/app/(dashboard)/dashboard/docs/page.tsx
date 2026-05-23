"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MODULES = [
  {
    id: "crm",
    title: "CRM — Müşteri İlişkileri",
    icon: "pi-users",
    color: "#0ea5e9",
    route: "/dashboard/crm",
    sections: [
      {
        title: "Müşteriler",
        route: "/dashboard/crm/customers",
        desc: "Tüm müşteri kayıtları burada yönetilir. Kurumsal ve bireysel müşteri türleri desteklenir.",
        actions: ["Müşteri listesini görüntüle", "Yeni müşteri ekle (Yeni Müşteri butonu)", "Müşteri detayına tıkla: etkileşimler, notlar, satışlar", "Pipeline aşamasını düzenle"],
        fields: ["Ad/Şirket Adı", "E-posta", "Telefon", "Adres/Şehir", "Vergi No", "Pipeline Aşaması"],
        stages: ["lead", "prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
      },
    ],
  },
  {
    id: "sales",
    title: "Satış Yönetimi",
    icon: "pi-shopping-cart",
    color: "#6366f1",
    route: "/dashboard/sales",
    sections: [
      {
        title: "Satış Siparişleri",
        route: "/dashboard/sales/orders",
        desc: "Müşterilere verilen siparişlerin takibi.",
        actions: ["Yeni sipariş oluştur", "Sipariş durumunu güncelle", "Fatura oluştur/indir"],
        fields: ["Sipariş No", "Müşteri", "Kalemler", "Toplam Tutar", "Durum", "Teslimat Tarihi"],
        stages: ["draft → confirmed → delivered → cancelled"],
      },
      {
        title: "Ürün / Hizmet Kataloğu",
        route: "/dashboard/sales/products",
        desc: "Satışa sunulan ürün ve hizmetler.",
        actions: ["Ürün ekle", "Fiyat güncelle", "SKU yönet"],
        fields: ["Ürün Adı", "SKU", "Birim Fiyat", "Birim", "Kategori", "Stok"],
        stages: [],
      },
    ],
  },
  {
    id: "stock",
    title: "Stok & Depo",
    icon: "pi-box",
    color: "#f59e0b",
    route: "/dashboard/stock",
    sections: [
      {
        title: "Stok Kalemleri",
        route: "/dashboard/stock/items",
        desc: "Ürün ve malzemelerin stok miktarları. Minimum stok altına düşüldüğünde uyarı verir.",
        actions: ["Stok girişi yap", "Stok çıkışı yap", "Minimum stok limiti belirle"],
        fields: ["Ürün Adı", "SKU", "Mevcut Miktar", "Min. Miktar", "Birim", "Depo", "Maliyet"],
        stages: [],
      },
    ],
  },
  {
    id: "production",
    title: "Üretim",
    icon: "pi-cog",
    color: "#10b981",
    route: "/dashboard/production",
    sections: [
      {
        title: "Üretim Emirleri",
        route: "/dashboard/production/orders",
        desc: "Üretim süreçlerinin planlanması ve takibi.",
        actions: ["Yeni üretim emri oluştur", "Durumu güncelle", "Hat ve yöntem ata"],
        fields: ["Emir No", "Ürün", "Miktar", "Üretim Hattı", "Yöntem", "Tarih Aralığı"],
        stages: ["planned → in_progress → completed / cancelled"],
      },
    ],
  },
  {
    id: "hr",
    title: "İnsan Kaynakları",
    icon: "pi-id-card",
    color: "#ec4899",
    route: "/dashboard/employees",
    sections: [
      {
        title: "Çalışanlar",
        route: "/dashboard/employees",
        desc: "Personel kayıtları, departman ve pozisyon bilgileri.",
        actions: ["Yeni çalışan ekle", "Departman ata", "Sicil bilgilerini düzenle"],
        fields: ["Sicil No", "Ad Soyad", "Departman", "Pozisyon", "İşe Giriş", "Maaş"],
        stages: [],
      },
      {
        title: "İzin Talepleri",
        route: "/dashboard/hr/leaves",
        desc: "Yıllık izin, hastalık ve ücretsiz izin talepleri.",
        actions: ["Talep oluştur", "Onayla / Reddet", "Kalan izin günlerini gör"],
        fields: ["Çalışan", "İzin Türü", "Başlangıç/Bitiş", "Gün Sayısı", "Durum"],
        stages: ["pending → approved / rejected"],
      },
    ],
  },
  {
    id: "fleet",
    title: "Filo Yönetimi",
    icon: "pi-car",
    color: "#8b5cf6",
    route: "/dashboard/fleet",
    sections: [
      {
        title: "Araçlar",
        route: "/dashboard/fleet",
        desc: "Şirkete ait araçların takibi, sigorta ve muayene tarihleri.",
        actions: ["Araç ekle", "Sigorta/muayene tarihini güncelle", "Yakıt kaydı ekle"],
        fields: ["Plaka", "Marka", "Model", "Yıl", "Yakıt Tipi", "Durum", "Sigorta Bitiş"],
        stages: ["active", "maintenance", "inactive"],
      },
    ],
  },
  {
    id: "maintenance",
    title: "Ekipman & Bakım",
    icon: "pi-wrench",
    color: "#ef4444",
    route: "/dashboard/maintenance",
    sections: [
      {
        title: "Ekipmanlar",
        route: "/dashboard/equipment",
        desc: "Makine ve cihaz envanteri.",
        actions: ["Ekipman kaydet", "Bakım takvimi oluştur", "Arıza kaydı aç"],
        fields: ["Kod", "Ad", "Marka/Model", "Konum", "Satın Alma", "Garanti"],
        stages: ["active", "maintenance", "out_of_service"],
      },
    ],
  },
  {
    id: "quality",
    title: "Kalite Yönetimi",
    icon: "pi-check-circle",
    color: "#14b8a6",
    route: "/dashboard/quality",
    sections: [
      {
        title: "Kalite Kontrolleri",
        route: "/dashboard/quality/checks",
        desc: "Gelen/giden/süreç içi kalite kontrol kayıtları. PPM takibi yapılır.",
        actions: ["Yeni kontrol kaydı gir", "Sonuç güncelle", "Standart ata"],
        fields: ["Ürün", "Parti No", "Miktar", "Hata Sayısı", "PPM", "Sonuç", "Denetçi"],
        stages: ["pending → passed / failed"],
      },
    ],
  },
  {
    id: "projects",
    title: "Proje & Görev",
    icon: "pi-chart-bar",
    color: "#f97316",
    route: "/dashboard/projects",
    sections: [
      {
        title: "Projeler",
        route: "/dashboard/projects",
        desc: "Proje takibi, kilometre taşları ve ilerleme.",
        actions: ["Proje oluştur", "Görev ekle", "Kilometre taşı belirle"],
        fields: ["Proje Adı", "Durum", "Bütçe", "İlerleme %", "Başlangıç/Bitiş", "Müdür"],
        stages: ["planning → active → on_hold → completed"],
      },
    ],
  },
  {
    id: "admin",
    title: "Yönetim Paneli",
    icon: "pi-sliders-h",
    color: "#6366f1",
    route: "/dashboard/admin",
    sections: [
      {
        title: "Şirket Ayarları",
        route: "/dashboard/admin/settings",
        desc: "Marka renkleri, logo, para birimi ve dil ayarları.",
        actions: ["Logo yükle", "Marka rengini değiştir", "Para birimini belirle"],
        fields: ["Şirket Adı", "Logo", "Ana Renk", "İkincil Renk", "Para Birimi", "Zaman Dilimi"],
        stages: [],
      },
      {
        title: "Kullanıcılar & Roller",
        route: "/dashboard/admin/users",
        desc: "Kullanıcı ekleme ve yetki yönetimi.",
        actions: ["Kullanıcı davet et", "Rol ata", "Yetki düzenle"],
        fields: ["Ad", "E-posta", "Rol", "Son Giriş", "Durum"],
        stages: [],
      },
    ],
  },
];

export default function DocsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const filtered = MODULES.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.sections.some(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.desc.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sistem Dokümantasyonu</h1>
        <p className="text-foreground/60 mt-1">Tüm modüller, işlevler ve kullanım kılavuzu</p>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-sm" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Modül veya özellik ara..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#2563eb)]/30"
        />
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((mod) => (
          <div
            key={mod.id}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            {/* Module Header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-border/30 transition-colors text-left"
              onClick={() => setActive(active === mod.id ? null : mod.id)}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: mod.color + "20" }}
              >
                <i className={`pi ${mod.icon} text-base`} style={{ color: mod.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{mod.title}</p>
                <p className="text-xs text-foreground/50 truncate">{mod.route}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(mod.route);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-border transition-colors text-foreground/70"
                >
                  Sayfaya Git
                </button>
                <i
                  className={`pi pi-chevron-down text-foreground/40 text-xs transition-transform ${active === mod.id ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* Expanded sections */}
            {active === mod.id && (
              <div className="border-t border-border divide-y divide-border/50">
                {mod.sections.map((section) => (
                  <div key={section.title} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground">{section.title}</p>
                      <button
                        onClick={() => router.push(section.route)}
                        className="text-xs text-[var(--color-primary,#2563eb)] hover:underline flex items-center gap-1"
                      >
                        Git <i className="pi pi-arrow-right text-[10px]" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground/60">{section.desc}</p>

                    {section.actions.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-foreground/50 uppercase tracking-wide mb-1">
                          Yapılabilecekler
                        </p>
                        <ul className="space-y-0.5">
                          {section.actions.map((a) => (
                            <li key={a} className="text-xs text-foreground/70 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-foreground/30 flex-shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {section.fields.map((f) => (
                          <span
                            key={f}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-foreground/60"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {section.stages.length > 0 && (
                      <p className="text-[11px] text-foreground/50 italic">
                        Durum akışı: {section.stages.join(" / ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-foreground/40">
          <i className="pi pi-search text-4xl mb-3" />
          <p>&quot;{search}&quot; için sonuç bulunamadı</p>
        </div>
      )}
    </div>
  );
}
