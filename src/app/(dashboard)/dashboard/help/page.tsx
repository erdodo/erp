"use client";

import { useState } from "react";

interface FaqItem { q: string; a: string; category: string }

const FAQS: FaqItem[] = [
  { category: "Genel", q: "ERP'ye nasıl giriş yapabilirim?", a: "Sol üst köşedeki kullanıcı adı ve şifrenizle giriş yapabilirsiniz. İlk girişte şifrenizi değiştirmeniz önerilir." },
  { category: "Genel", q: "Tema nasıl değiştirilir?", a: "Header'daki güneş/ay ikonuna tıklayarak açık/koyu tema arasında geçiş yapabilirsiniz." },
  { category: "Müşteriler", q: "Müşteri nasıl eklenir?", a: "Müşteriler menüsünden '+Yeni Müşteri' butonuna tıklayın, formu doldurup kaydedin." },
  { category: "Müşteriler", q: "Müşteri silinemiyorsa ne yapmalıyım?", a: "Bağlı siparişi veya sözleşmesi olan müşteriler silinemez. Önce bağlı kayıtları silin veya pasife alın." },
  { category: "Stok", q: "Stok hareketi nasıl girilir?", a: "Stok → İlgili ürün → Hareket Ekle butonundan giriş/çıkış/transfer hareketi oluşturabilirsiniz." },
  { category: "Stok", q: "Minimum stok uyarısı nasıl ayarlanır?", a: "Stok kalemi düzenleme ekranından 'Minimum Stok' alanını doldurun. Düşünce otomatik uyarı gelir." },
  { category: "İK", q: "İzin talebi nasıl onaylanır?", a: "İzin Yönetimi sayfasından bekleyen talepleri görüntüleyin ve 'Onayla' butonuna tıklayın." },
  { category: "İK", q: "Departman nasıl oluşturulur?", a: "Çalışanlar sayfasındaki departman filtresi üzerinden yeni departman ekleyebilirsiniz." },
  { category: "Finans", q: "Fatura nasıl oluşturulur?", a: "Finans → Faturalar → 'Yeni Fatura' ile müşteri seçip ürün/hizmet satırı ekleyerek fatura oluşturabilirsiniz." },
  { category: "Finans", q: "Masraf onayı nasıl işler?", a: "Masraf Yönetimi sayfasında Bekleyen masrafları yöneticiler 'Onayla'/'Reddet' ile işleyebilir." },
  { category: "Üretim", q: "Üretim emri nasıl açılır?", a: "Üretim → Emirler → 'Yeni Emir' ile ürün, miktar ve hat seçerek emir oluşturabilirsiniz." },
  { category: "Proje", q: "Görev Kanban panosu nasıl kullanılır?", a: "Görev Yönetimi sayfasında sütunlardaki butonlarla görev durumunu sürüklemeden değiştirebilirsiniz." },
  { category: "Teknik", q: "API anahtarı nerede oluşturulur?", a: "Ayarlar → API Anahtarları sayfasından güvenli entegrasyon tokenı oluşturabilirsiniz. Anahtar yalnızca bir kez gösterilir." },
  { category: "Teknik", q: "Veri export nasıl yapılır?", a: "Listelerde bulunan 'Dışa Aktar' butonundan CSV formatında veri indirebilirsiniz." },
];

const CATEGORIES = Array.from(new Set(FAQS.map((f) => f.category)));

const SHORTCUTS = [
  { keys: ["Alt", "/"], desc: "Global arama" }, { keys: ["Alt", "D"], desc: "Dashboard" },
  { keys: ["Alt", "M"], desc: "Müşteriler" },   { keys: ["Esc"], desc: "Modalı kapat" },
  { keys: ["Alt", "N"], desc: "Bildirimler" },  { keys: ["Alt", "T"], desc: "Tema geçiş" },
];

export default function HelpPage() {
  const [search,   setSearch]   = useState("");
  const [catF,     setCatF]     = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = FAQS.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    const matchCat = !catF || f.category === catF;
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      <div className="text-center space-y-2 pt-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-question-circle text-white text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Yardım Merkezi</h1>
        <p className="text-slate-400">Sık sorulan sorular ve kısayollar</p>
      </div>

      <div className="relative">
        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Soru veya konu ara…" className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-foreground text-sm focus:outline-none bg-white dark:bg-slate-900" />
      </div>

      <div className="flex flex-wrap gap-2">
        {["", ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setCatF(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${catF === cat ? "" : "border-border text-slate-500"}`}
            style={catF === cat ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", border: "1px solid" } : {}}>
            {cat || "Tümü"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <div className="py-10 text-center text-slate-400">Sonuç bulunamadı</div>}
        {filtered.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
            <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
              <div className="flex items-start gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mt-0.5">{f.category}</span>
                <span className="font-medium text-foreground text-sm">{f.q}</span>
              </div>
              <i className={`pi pi-chevron-down text-slate-400 text-xs transition-transform shrink-0 ml-3 ${expanded === i ? "rotate-180" : ""}`} />
            </button>
            {expanded === i && <div className="px-4 pb-4 text-sm text-slate-500 leading-relaxed border-t border-border/50 pt-3">{f.a}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><i className="pi pi-bolt" style={{ color: "var(--color-primary)" }} />Klavye Kısayolları</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => <kbd key={k} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">{k}</kbd>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-5 text-center">
        <i className="pi pi-envelope text-3xl mb-2 block" style={{ color: "var(--color-primary)" }} />
        <p className="font-semibold text-foreground mb-1">Daha fazla yardım mı lazım?</p>
        <p className="text-sm text-slate-400 mb-3">Destek ekibimize e-posta gönderin</p>
        <a href="mailto:destek@erp.local" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-envelope text-xs" />destek@erp.local
        </a>
      </div>
    </div>
  );
}
