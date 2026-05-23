# ERP Sistemi - 22 Adımlık Geliştirme Planı

Next.js 14 + Prisma/SQLite + PrimeReact + TailwindCSS tabanlı, multi-tenant, modüler ERP sistemi.

## Teknoloji

- **Framework**: Next.js 14 (App Router), TypeScript
- **UI**: PrimeReact + TailwindCSS
- **Auth**: NextAuth.js (Credentials)
- **DB**: Prisma + SQLite
- **i18n**: next-intl (TR varsayılan)
- **State**: Zustand
- **Offline**: Dexie.js (IndexedDB)
- **Dashboard**: @dnd-kit + Chart.js + jsPDF + xlsx
- **Kısayollar**: Özel hook sistemi (Alt tuşu hint overlay)
- **Sağ Tık**: Özel ContextMenu bileşeni (tablo, input, genel)
- **Sekmeler**: Tarayıcı içi sekme/pencere yönetimi (BroadcastChannel API)

---

## ADIM 1: Proje Kurulumu & Temel Konfigürasyon

- Next.js projesi oluştur (app router, typescript, tailwind, src-dir)
- Tüm npm bağımlılıklarını kur (primereact, next-auth, prisma, next-intl, zustand, dexie, dnd-kit, chart.js, jspdf, xlsx, bcryptjs, zod, date-fns)
- `tailwind.config.ts`: CSS değişkenleri ile branding renkleri (`--color-primary`, `--color-secondary`)
- `next.config.js`: next-intl plugin
- `.env`: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- `src/lib/prisma.ts`: Prisma client singleton
- i18n: `public/locales/tr/common.json` (tüm modül isimleri, butonlar, menü), `en/common.json` (boş şablon)
- **Çıktı**: `npm run dev` çalışır, TailwindCSS + PrimeReact render edilir

---

## ADIM 2: Veritabanı Şeması (Prisma)

Tüm tabloları tek schema.prisma'da tanımla. Detaylı modeller ayrı bir dosyada (`docs/schema-details.md`) belgelenecek.

**Soft Delete**: Tüm tablolara `deletedAt DateTime?` alanı eklenir. Silme işlemleri `deletedAt = now()` olarak güncellenir, kalıcı silme yapılmaz. Prisma middleware ile tüm sorgulara otomatik `deletedAt: null` filtresi eklenir. SuperAdmin kalıcı silme yapabilir.

**Çekirdek**: Tenant, User, Role, Permission, RolePermission, TenantModule, **TenantQuota**, **AuditLog**
**Bildirim**: Notification
**Workflow**: Workflow, WorkflowStep, WorkflowExecution
**Dashboard**: DashboardLayout, DashboardWidget
**CRM**: Customer, CustomerContact, CustomerInteraction
**Üretim**: ProductionOrder, ProductionLine, ProductionMethod
**Kalite**: QualityCheck, QualityStandard
**Proje**: Project, ProjectMilestone
**Görev**: Task, TaskComment
**Ekipman**: Equipment
**Stok**: StockItem, StockMovement, Warehouse
**Malzeme**: Material
**5S**: FiveSAudit
**İzin**: LeaveRequest, LeaveBalance
**Süreç**: ProcessFlow, ProcessComment
**Güzergah**: ServiceRoute, ServiceStop
**Masraf**: Expense, ExpenseCategory
**Çalışan**: Employee
**İşe Alım**: JobPosting, JobApplication, Interview
**Filo**: Vehicle, FuelRecord
**Satış**: Sale, SaleItem
**Mağaza**: RetailStore, RetailTransaction
**Abonelik**: Subscription, SubscriptionRenewal
**Kira**: RentalProperty, RentalContract, RentalPayment
**Sanal Satış**: VirtualSaleChannel, VirtualSaleOrder
**Saha**: FieldService
**Envanter**: InventoryItem, InventoryCount, InventoryCountItem
**Bakım**: MaintenanceSchedule, MaintenanceRecord
**IoT**: IoTDevice, IoTReading

- Her modül tablosu `tenantId` içerir (tenant izolasyonu)
- Her tabloda `deletedAt DateTime?` alanı (soft delete)
- `prisma/seed.ts`: SuperAdmin kullanıcı + varsayılan Permission kayıtları + örnek tenant + varsayılan kota tanımları

**Yeni: AuditLog Modeli**:
```
AuditLog { id, tenantId, userId, action(create/update/delete/login/export), module, recordId, oldData(JSON), newData(JSON), ipAddress, userAgent, createdAt }
```
- Tüm CRUD işlemleri otomatik loglanır
- Kim, ne zaman, hangi modülde, hangi kaydı, nasıl değiştirdi

**Yeni: TenantQuota Modeli** (SuperAdmin kontrollü sınırlandırmalar):
```
TenantQuota { id, tenantId, resource("employees"/"projects"/"customers"/"sales"...), maxCount, currentCount, isUnlimited(default:false) }
```
- Her tenant için modül/kaynak bazlı limit tanımlanır
- Örn: Bu tenant max 5 personel, 3 proje, 100 müşteri ekleyebilir
- Limit dolduğunda yeni kayıt oluşturulamaz, uyarı gösterilir
- SuperAdmin tenant bazlı limitleri ayarlar
- `isUnlimited: true` ise sınırsız

- **Çıktı**: `npx prisma db push` başarılı, seed çalışır

---

## ADIM 3: Kimlik Doğrulama (Auth)

- `src/lib/auth.ts`: NextAuth CredentialsProvider (bcrypt), JWT strategy
- JWT callback: userId, tenantId, isSuperAdmin, isAdmin, roleId token'a eklenir
- `/register`: Ad, Email, Şifre, Şirket Adı → Tenant + User(isAdmin:true) + varsayılan roller + tüm modüller kapalı oluşturulur → otomatik giriş
- `/login`: Email + Şifre, hata mesajları. SuperAdmin gizli giriş (URL parametresi)
- `src/middleware.ts`: /dashboard/* oturum kontrolü, /superadmin/* isSuperAdmin kontrolü, pasif kullanıcı engeli
- **Çıktı**: Kayıt → tenant oluşturma → giriş akışı çalışır

---

## ADIM 4: Multi-Tenant, Yetkilendirme, Audit & Kota

- `src/lib/permissions.ts`: `checkPermission(userId, module, action)`, `getUserPermissions(userId)`
- `src/lib/modules.ts`: Modül tanımları (slug, isim, ikon, rota), `getActiveModules(tenantId)`, `isModuleActive(tenantId, slug)`
- `src/hooks/usePermission.ts`: `can("crm","view")` → boolean
- `src/hooks/useModule.ts`: Aktif modül listesi
- `<PermissionGate module="crm" action="create">` bileşeni
- Middleware'e modül erişim kontrolü ekle: kapalı modülün URL'sine gidilirse → "Modül aktif değil" sayfası
- Prisma helper: `withTenant(tenantId)` — tüm sorgulara tenantId filtresi

**Yeni: Soft Delete Middleware**:
- Prisma middleware: tüm `findMany/findFirst/findUnique` sorgularına `deletedAt: null` filtresi ekler
- `delete` çağrısını `update({ deletedAt: now() })` olarak yönlendirir
- SuperAdmin için `forceDelete` parametresi ile kalıcı silme imkanı

**Yeni: Audit Log Sistemi**:
- `src/lib/audit.ts`: `logAction({ userId, tenantId, action, module, recordId, oldData, newData })`
- Prisma middleware: her create/update/delete işleminde otomatik AuditLog kaydı oluşturur
- `/dashboard/admin/audit-log`: Admin için denetim kaydı görüntüleme (filtrelenebilir: kullanıcı, modül, tarih, aksiyon)
- `/dashboard/superadmin/audit-log`: SuperAdmin tüm tenant'ların loglarını görebilir

**Yeni: Tenant Kota Sistemi**:
- `src/lib/quota.ts`: `checkQuota(tenantId, resource)` → {allowed: boolean, current, max, remaining}
- `src/hooks/useQuota.ts`: `const { canCreate, remaining } = useQuota("employees")`
- Her kayıt oluşturma öncesi kota kontrolü yapılır
- Limit dolduğunda: "Limitinize ulaştınız. Yöneticinize başvurun." mesajı
- "Ekle" butonları limit dolduğunda disabled + tooltip ile bilgi

- **Çıktı**: Tenant izolasyonu, soft delete, audit log, dinamik yetki, kota kontrolü, modül erişim kontrolü çalışır

---

## ADIM 5: Layout, Navigasyon, Tema, Klavye Kısayolları, Sekmeler & Sağ Tık Menü

### 5A — Layout & Tema (temel)
- `src/app/(dashboard)/layout.tsx`: Sidebar + Header + TabBar + Content
- **Sidebar**: Modül grupları, sadece aktif modüller, daraltılabilir, mobilde hamburger
- **Header**: Global arama, bildirim ikonu+badge, kullanıcı dropdown, dil seçimi
- `src/hooks/useBranding.ts`: Tenant renkleri → CSS değişkenleri
- `src/stores/theme-store.ts`: Koyu/açık tema, sidebar durumu (LocalStorage)
- Responsive: 320px'den itibaren, tablolar mobilde card'a dönüşür
- Ortak bileşenler: PageHeader, DataTable wrapper, FormDialog, ConfirmDialog, StatusBadge, EmptyState, LoadingSpinner

**Yeni: Global Arama (Spotlight Search)**:
- `src/components/ui/GlobalSearch.tsx`: Header'daki arama çubuğu (Alt+/ ile focus)
- Tüm modüllerde aynı anda arama: müşteri adı, sipariş no, çalışan adı, proje adı, ekipman kodu vs.
- Her modül bir `searchProvider` kaydeder: hangi alanlardan aranacak, sonuç formatı, link
- Sonuçlar modül bazlı gruplu gösterilir (CRM: 3 sonuç, Satış: 2 sonuç...)
- Debounced arama (300ms), minimum 2 karakter
- Son aramalar geçmişi (LocalStorage)

**Yeni: Para Birimi & Sayı Formatı**:
- `src/lib/formatters.ts`: `formatCurrency(amount, currency)`, `formatNumber(value)`, `formatDate(date)`
- Türk formatı varsayılan: 1.234,56 ₺ — nokta binlik, virgül ondalık
- Desteklenen para birimleri: TRY, USD, EUR, GBP (tenant ayarlarında varsayılan seçilir)
- Tüm tutar alanlarında otomatik formatlama

**Yeni: Paylaşılan Takvim Bileşeni**:
- `src/components/ui/SharedCalendar.tsx`: PrimeReact FullCalendar wrapper
- Farklı modüllerden gelen tarihleri tek takvimde birleştirme: izinler (mavi), bakım (turuncu), sahaCRM (yeşil), mülakatlar (mor)
- Aylık/haftalık/günlük görünüm
- Modül filtresi: hangi modüllerin tarihleri gösterilsin
- Tıklayınca ilgili kayda yönlendirme

**Yeni: Toplu Veri İçe Aktarma (Bulk Import)**:
- `src/components/ui/BulkImport.tsx`: Tüm modüllerde kullanılabilen ortak import bileşeni
- Excel/CSV dosya yükleme → kolon eşleştirme (mapping) → önizleme → onay → içe aktar
- Hata satırlarını raporla (3. satırda email formatı hatalı gibi)
- Şablon Excel dosyası indirme (modüle göre)
- Desteklenen modüller: Müşteri, Çalışan, Malzeme, Stok, Envanter, Ürün, Araç vs.

**Yeni: Yazdırma Şablon Sistemi**:
- `src/lib/print-templates.ts`: Şablon motoru
- `src/components/ui/PrintPreview.tsx`: Yazdırma önizleme bileşeni
- Varsayılan şablonlar: Fatura, İrsaliye, Teklif Mektubu, Sipariş Formu, İzin Belgesi, Bakım Raporu, 5S Denetim Raporu
- Şablonlarda tenant logo + branding renkleri otomatik
- Admin şablonları özelleştirebilir (basit HTML editör)
- Her şablondan PDF veya doğrudan yazdırma

### 5B — Klavye Kısayolları (Mouse-Free UX)
Tüm program mouse olmadan kullanılabilir olacak.

- `src/hooks/useKeyboardShortcuts.ts`: Global kısayol yöneticisi
- `src/hooks/useHotkey.ts`: Bileşen seviyesinde kısayol tanımlama
- `src/components/ui/ShortcutHint.tsx`: Alt basıldığında görünen kısayol etiketi (küçük badge)
- `src/stores/shortcut-store.ts`: Kayıtlı kısayolların merkezi deposu

**Davranış**:
- Kullanıcı **Alt tuşuna basılı tuttuğu anda** tüm sayfalarda, tablarda, butonlarda ve inputlarda yanlarında küçük tuş etiketleri (badge) belirir
- Alt bırakıldığında etiketler kaybolur
- Alt basılıyken ilgili tuşa basılırsa aksiyon tetiklenir

**Navigasyon kısayolları** (Alt + harf):
- Alt+C → CRM, Alt+S → Satış, Alt+P → Üretim, Alt+E → Envanter vs. (her modülün kısayolu i18n JSON'da tanımlı)
- Alt+H → Ana sayfa (dashboard)
- Alt+N → Bildirimler
- Alt+? → Kısayol listesi modal

**Sekme kısayolları**:
- Alt+1..9 → İlgili sekmeye geç
- Alt+T → Yeni sekme aç
- Alt+W → Aktif sekmeyi kapat
- Alt+← / Alt+→ → Önceki/sonraki sekme

**Form kısayolları**:
- Form/dialog açıldığında otomatik olarak ilk input'a focus olur
- Tab → Sonraki input'a geç
- Shift+Tab → Önceki input'a geç
- ↑/↓ ok tuşları → Select, radio, liste elemanları arasında geçiş
- Alt+Enter → Formu gönder (submit)
- Escape → Dialog/modal kapat
- Alt+N (form içinde) → "Yeni Ekle" butonu

**Tablo kısayolları**:
- ↑/↓ → Satır seçimi değiştir
- Enter → Seçili satırı aç/düzenle
- Delete → Seçili satırı silme onayı
- Alt+F → Tablo filtre panelini aç
- Alt+X → Seçili satırları export et

**Global**:
- Alt+K → Komut paleti (spotlight/command palette): modül ara, aksiyon çalıştır
- Alt+/ → Global arama focus
- Alt+D → Koyu/açık tema geçiş

**Implementasyon**:
- Tüm kısayollar `shortcut-store.ts`'de merkezi olarak tanımlanır
- Her sayfa/bileşen `useHotkey("alt+c", callback)` ile kendi kısayollarını kaydeder
- ShortcutHint bileşeni, Alt basıldığında ilgili elemanın yanında badge gösterir
- `<ShortcutHint shortcut="C">` → Alt basıldığında "C" badge'i görünür
- Kısayol çakışma kontrolü: aynı tuş iki yere atanmışsa uyarı (dev modda)

### 5C — Sekme & Pencere Sistemi (Native mod özelliği)
Kullanıcı aynı anda birden fazla modülü sekme olarak açabilir.

- `src/stores/tab-store.ts` (Zustand + LocalStorage persist):
  - `tabs: Tab[]` → {id, title, url, icon, isActive, isPinned}
  - `addTab(url)`, `removeTab(id)`, `setActiveTab(id)`, `reorderTabs(from, to)`
- `src/components/layout/TabBar.tsx`: Header altında sekme çubuğu
  - Sekmeler sürükle-bırak ile sıralanabilir
  - Sekme üzerine sağ tık: kapat, diğerlerini kapat, sabitle, yeni pencerede aç
  - Sekme sayısı fazlaysa scroll/overflow menü
- `src/components/layout/SplitView.tsx`: Yan yana görünüm
  - Kullanıcı bir sekmeyi sağa/sola sürükleyerek split view oluşturabilir
  - Dikey ayırıcı (resizable divider)
  - Oranı sürükleyerek ayarlama
- **Yeni pencere**: Sekme sağ tık → "Yeni pencerede aç" → `window.open()` ile aynı URL yeni pencerede açılır
  - Pencereler arası state sync: **BroadcastChannel API** ile
  - Bir pencerede veri güncellendiğinde diğer pencereler de güncellenir
- **Not**: Bu özellik web'de çalışır ancak Golang WebView native build'de tam işlevsel olacak

### 5D — Sağ Tık Menü Sistemi (Context Menu)
Her yerde bağlama uygun sağ tık menüsü.

- `src/components/ui/ContextMenu.tsx`: Genel sağ tık bileşeni
- `src/hooks/useContextMenu.ts`: Bileşene sağ tık menüsü ekleme hook'u

**Tablo satırları için sağ tık**:
- Görüntüle (detay sayfası aç)
- Düzenle (edit dialog aç)
- Sil (onay dialog)
- Kopyala (satır verisini JSON olarak kopyala)
- Yeni sekmede aç
- Yeni pencerede aç
- Dışa aktar (sadece bu satır → PDF/Excel)
- Yazdır

**Input/Textarea için sağ tık**:
- Yapıştır
- Son girilen veriyi yapıştır (alan bazlı son değer LocalStorage'da tutulur)
- Clipboard geçmişi (son 10 kopyalanan metin listesi)
- Temizle (alanı boşalt)
- Tümünü seç

**Genel sayfa için sağ tık**:
- Sayfayı yenile
- Yeni sekmede aç
- Yazdır
- Dışa aktar (sayfa verisini export)
- Tam ekran

**Sidebar modül için sağ tık**:
- Yeni sekmede aç
- Yeni pencerede aç
- Sabitle / sabitlemesini kaldır

**Dashboard widget için sağ tık**:
- Düzenle
- Sil
- Kopyala
- Dışa aktar (PDF/Excel/PNG)
- Tam boyut / küçült

**Implementasyon**:
- `useContextMenu(ref, menuItems)` → ref'e sağ tık olayını bağlar
- `menuItems` dinamik: bağlama göre (tablo satırı, input, widget vs.) farklı menü öğeleri
- Menü pozisyonu: tıklanan noktada açılır, ekran kenarına yakınsa otomatik pozisyon ayarı
- Alt menüler (submenu) desteklenir
- Menü öğelerinde klavye kısayol göstergesi (sağ tarafta gri metin)
- `<ContextMenuProvider>` ile global clipboard geçmişi yönetimi

**Clipboard Geçmişi**:
- `src/stores/clipboard-store.ts`: Son 20 kopyalanan değer (Zustand + LocalStorage)
- Kopyalanan her metin otomatik geçmişe eklenir
- Input sağ tık → "Clipboard geçmişi" alt menüsünde liste gösterilir
- Seçilen değer input'a yapıştırılır

- **Çıktı**: Responsive layout, dinamik branding, aktif modül navigasyonu, tam klavye erişimi (mouse-free), sekme/pencere sistemi, her yerde sağ tık menüsü, global arama, takvim, toplu import, yazdırma şablonları, para formatı

---

## ADIM 6: SuperAdmin Paneli

- `/dashboard/superadmin`: İstatistik dashboard
- `/dashboard/superadmin/tenants`: Tenant CRUD, detay sayfası
- `/dashboard/superadmin/tenants/[id]/modules`: Toggle ile modül aç/kapa
- `/dashboard/superadmin/tenants/[id]/quotas`: **Tenant kota/limit yönetimi** — kaynak bazlı limit belirleme:
  - Personel: max 5 / sınırsız
  - Proje: max 3 / sınırsız
  - Müşteri: max 100 / sınırsız
  - Satış: max 500 / sınırsız
  - Depo: max 2 / sınırsız
  - Her modül kaynağı için ayrı limit slider/input
  - Mevcut kullanım ve kalan kapasite gösterimi
- `/dashboard/superadmin/database`: Tablo yöneticisi — herhangi bir tabloyu seç, CRUD yap, filtrele, JSON alanları düzenle
- `/dashboard/superadmin/users`: Tüm kullanıcıları listele, düzenle, şifre sıfırla
- `/dashboard/superadmin/audit-log`: Tüm tenant'ların denetim kayıtları
- Güvenlik: middleware'de isSuperAdmin kontrolü, menüde görünmez, işlemler loglanır
- **Çıktı**: SuperAdmin tüm sistemi, kotaları ve denetim kayıtlarını yönetebilir

---

## ADIM 7: Admin Paneli & Takım Yönetimi

- `/dashboard/admin/settings`: Şirket bilgileri, branding (color picker), bildirim tercihleri
- `/dashboard/admin/users`: Kullanıcı CRUD, rol atama, aktif/pasif
- `/dashboard/admin/roles`: Rol CRUD, modül×aksiyon izin matrisi (checkbox tablosu: Görüntüle/Ekle/Düzenle/Sil/Export)
- Departman yönetimi (CRUD, kullanıcı atama)
- **Çıktı**: Admin rolleri, yetkileri, kullanıcıları ve branding'i yönetebilir

---

## ADIM 8: Bildirim Sistemi

- `src/lib/notifications.ts`: createNotification, getNotifications, markAsRead, markAllAsRead
- SSE endpoint: `/api/notifications/stream` — gerçek zamanlı iletim
- Header'da bildirim ikonu + okunmamış badge
- Bildirim dropdown paneli (son 20, okundu işaretle)
- `/dashboard/notifications`: Tam liste, filtreleme (modül, tür, tarih)
- **Çıktı**: Gerçek zamanlı uygulama içi bildirimler çalışır

---

## ADIM 9: Workflow Motoru

- `src/lib/workflow-engine.ts`: executeWorkflow, evaluateCondition, executeStep
- Aksiyonlar: notify, createTask, updateStatus, assignUser, sendToModule, updateField, wait
- Koşul sistemi: JSON tabanlı (field, operator, value + and/or birleşik)
- `/dashboard/admin/workflows`: Workflow CRUD, adım ekleme, aktif/pasif, execution log
- Örnek şablonlar: Sipariş→Üretim, StokDüşük→SatınAlma, GörevTamamlandı→Proje
- **Çıktı**: Modüller arası otomatik iş akışları çalışır

---

## ADIM 10: Dashboard & Widget Sistemi

- @dnd-kit ile sürükle-bırak grid, widget resize
- Widget türleri: stat, chart (bar/line/pie/doughnut), table, list
- Widget ekleme sihirbazı: tür → veri kaynağı (tablo) → filtreler → kolonlar → sıralama → gruplama → başlık
- `src/lib/dashboard-data.ts`: getAvailableSources, queryData (dinamik Prisma sorgusu)
- Export: her widget'tan PDF/Excel/CSV/PNG, tüm dashboard PDF raporu
- Layout kullanıcı bazlı kaydedilir, birden fazla dashboard
- **Çıktı**: Özelleştirilebilir dashboard, widget ekleme/çıkarma/boyutlandırma, export

---

## ADIM 11: Dosya Depolama & Offline/Cache

- `src/lib/storage.ts`: StorageProvider interface (upload, download, delete, getUrl), LocalStorageProvider implementasyonu
- Provider .env'den belirlenir, tek fonksiyon üzerinden erişim
- `src/lib/cache.ts`: Dexie.js ile API yanıtlarını IndexedDB'de önbelleğe al
- syncQueue: offline yazma işlemleri kuyrukta, online olunca sırayla gönder
- `src/hooks/useOfflineSync.ts`: navigator.onLine dinle, otomatik sync, çakışma yönetimi
- Service Worker: statik asset cache, network-first API stratejisi
- **Çıktı**: Offline çalışma, otomatik sync, dosya yükleme abstraction

---

## ADIM 12: CRM Modülü

- `/dashboard/crm`: Dashboard (toplam müşteri, yeni, pipeline)
- `/dashboard/crm/customers`: DataTable (filtre, arama, sayfalama)
- `/dashboard/crm/customers/[id]`: Sekmeli detay (bilgiler, kişiler, etkileşimler, satışlar)
- `/dashboard/crm/customers/new`: Müşteri formu (bireysel/kurumsal)
- `/dashboard/crm/pipeline`: Kanban sürükle-bırak (lead→prospect→müşteri→aktif)
- Etkileşim kaydı, etiketleme, atama, import/export
- API: /api/modules/crm/customers CRUD + contacts + interactions
- **Çıktı**: CRM tam fonksiyonel

---

## ADIM 13: Satış & Ticaret Modülleri

- **Satış** (`/dashboard/sales`): Sipariş CRUD, müşteri+ürün seçimi, durum takibi (taslak→onay→üretim→sevk→teslim), fatura, raporlar
- **Mağaza** (`/dashboard/retail`): Mağaza CRUD, işlem kaydı (satış/iade/değişim), kasa raporu
- **Sanal Satış** (`/dashboard/virtual-sales`): Kanal tanımlama, sipariş listesi, kargo takip, kanal performansı
- **Abonelik** (`/dashboard/subscriptions`): Abonelik CRUD, yenileme takibi, süresi dolacaklar uyarısı
- **Çıktı**: 4 satış modülü tam fonksiyonel

---

## ADIM 14: Üretim & İmalat Modülleri

- **Üretim Takip** (`/dashboard/production`): Üretim emri CRUD, hat yönetimi, durum takibi, performans dashboard (OEE)
- **Üretim Metot** (`/dashboard/production-method`): Metot CRUD (versiyonlu), adımlar, malzeme/ekipman gereksinimleri, onay süreci
- **5S** (`/dashboard/five-s`): Denetim CRUD, 5 kategori puanlama (1-5), radar chart, düzeltici aksiyonlar→Task entegrasyonu
- **Çıktı**: Üretim emirleri, metotlar, 5S denetimleri çalışır

---

## ADIM 15: Envanter & Stok Modülleri

- **Stok** (`/dashboard/stock`): Stok listesi (depo bazlı), hareket kayıtları (giriş/çıkış/transfer), depo CRUD, min stok uyarısı
- **Envanter** (`/dashboard/inventory`): Öğe CRUD, barkod/SKU arama, sayım (başlat→say→fark raporu→onayla), kategori yönetimi
- **Malzeme Kütüphanesi** (`/dashboard/materials`): Malzeme kartı (teknik özellikler, tedarikçiler, min sipariş, temin süresi), arama/filtreleme
- **Çıktı**: Stok, envanter, malzeme yönetimi tam fonksiyonel

---

## ADIM 16: Kalite & Bakım Modülleri

- **Kalite PPM** (`/dashboard/quality`): Kalite kontrol CRUD (gelen/süreç içi/final/müşteri), PPM hesaplama, kalite standardı tanımlama, trend grafikleri
- **Bakım** (`/dashboard/maintenance`): Bakım planı CRUD (önleyici/düzeltici/kestirimci), frekans, son/sonraki tarih, bakım kaydı, maliyet takibi
- **Ekipman** (`/dashboard/equipment`): Ekipman CRUD (marka/model/seri no/lokasyon), durum takibi, garanti takibi, bakım geçmişi entegrasyonu
- **Çıktı**: Kalite, bakım, ekipman modülleri çalışır

---

## ADIM 17: İK & Personel Modülleri

- **Çalışan** (`/dashboard/employees`): Çalışan CRUD (sicil no, departman, pozisyon, maaş, yönetici hiyerarşisi), User hesabına bağlama
- **İşe Alım** (`/dashboard/recruitment`): İlan CRUD, başvuru takibi (yeni→inceleme→mülakat→teklif→işe alım), mülakat planlama, değerlendirme
- **İzin** (`/dashboard/leave`): İzin talebi (yıllık/hastalık/mazeret vs.), onay süreci, bakiye takibi (yıl bazlı), takvim görünümü
- **Çıktı**: Çalışan, işe alım, izin modülleri çalışır

---

## ADIM 18: Proje & Görev Yönetimi

- **Proje** (`/dashboard/project`): Proje CRUD (bütçe, ilerleme, kilometre taşları), Gantt benzeri timeline, proje dashboard
- **Görev** (`/dashboard/tasks`): Görev CRUD (alt görev desteği), Kanban (todo→devam→review→done), atama, süre takibi, yorumlar
- **Süreç Takibi** (`/dashboard/process-tracking`): Departmanlar arası süreç CRUD, durum takibi, yorum/ek dosya, SLA takibi
- **Çıktı**: Proje, görev, departmanlar arası süreç modülleri çalışır

---

## ADIM 19: Saha, Filo & Masraf Modülleri

- **Saha Hizmetleri** (`/dashboard/field-services`): Servis CRUD (kurulum/tamir/bakım/denetim), teknisyen atama, durum takibi, imza/fotoğraf
- **Filo** (`/dashboard/fleet`): Araç CRUD (plaka/marka/model/yakıt), yakıt kayıtları, sigorta/muayene takibi, sürücü atama
- **Güzergah** (`/dashboard/service-routes`): Güzergah CRUD, durak ekleme (sıralı), araç/sürücü atama, durum takibi
- **Masraf** (`/dashboard/expenses`): Masraf CRUD (kategori/tutar/makbuz), onay süreci, kategori yönetimi, bütçe limiti
- **Kira** (`/dashboard/rent`): Mülk CRUD, sözleşme yönetimi (kiracı/dönem/tutar), ödeme takibi (bekleyen/ödenen/geciken)
- **Çıktı**: 5 modül tam fonksiyonel

---

## ADIM 20: IoT Entegrasyonu & Final

- **IoT** (`/dashboard/iot`): Cihaz CRUD (ID/tür/lokasyon/üretim hattı), canlı durum (online/offline), okuma geçmişi
- **IoT API**: `POST /api/iot/readings` — harici cihazlardan veri alma, üretim sayımı gönderme, otomatik üretim emri güncelleme

**Yeni: API Güvenliği** (IoT ve harici entegrasyonlar):
- `src/lib/api-auth.ts`: API Key yönetimi
- `/dashboard/admin/api-keys`: Tenant admin API key oluşturma/silme/yenileme
- Rate limiting: IP bazlı (varsayılan 100 req/dk) + API key bazlı (1000 req/dk)
- API key header: `X-API-Key` veya `Authorization: Bearer <key>`
- Her API çağrısı loglanır (AuditLog'a)
- Geçersiz key → 401, rate limit → 429 yanıtı
- SuperAdmin global rate limit ayarları

- **Final**: Tüm modüller arası workflow entegrasyon testi, performans optimizasyonu, hata kontrolü, eksik çeviriler tamamlama
- **Çıktı**: IoT entegrasyonu çalışır, API güvenli, tüm sistem uçtan uca test edilmiş

---

## ADIM 21: Dökümantasyon & Uygulama İçi Rehber

Hem geliştirici hem son kullanıcı için kapsamlı dökümantasyon.

### 21A — Uygulama İçi Rehber & Yönlendirmeler

- `src/components/ui/HelpTooltip.tsx`: Her form alanı, buton ve bölüm yanında (?) ikonu, tıklayınca açıklama gösterir
- `src/components/ui/GuidedTour.tsx`: Sayfa bazlı adım adım tur (ilk ziyarette otomatik, sonra tekrar açılabilir)
  - Spotlight efekti ile hedef elemanı vurgulama
  - İleri/Geri/Atla butonları
  - Her modül için ayrı tur tanımı (JSON bazlı)
- `src/components/ui/EmptyStateGuide.tsx`: Boş sayfalarda "Nasıl başlarsınız?" rehberi
  - Örn: CRM'de hiç müşteri yokken → "1. Müşteri ekleyin 2. Pipeline oluşturun 3. Etkileşim kaydedin"
- `src/components/ui/WhatsNew.tsx`: Yeni özellik duyuruları (SuperAdmin tarafından yönetilir)
- `/dashboard/help`: Yardım merkezi sayfası
  - Modül bazlı sık sorulan sorular (FAQ)
  - Aranabilir bilgi bankası
  - Klavye kısayolları tam listesi
- Uygulama içi mesajlar i18n ile çoklu dil desteği

### 21B — Kullanıcı Dökümantasyonu (Dış)

Tüm programın tüm işlevlerini anlatan detaylı döküman.

- `docs/` klasörü altında Markdown bazlı dökümantasyon
- **Genel**:
  - Giriş & Kayıt rehberi
  - Dashboard kullanımı (widget ekleme, export, düzenleme)
  - Profil ve ayarlar
  - Klavye kısayolları tam referansı
  - Sağ tık menü referansı
  - Sekme & pencere sistemi kullanımı
- **Modül bazlı** (her modül için ayrı döküman):
  - Modülün amacı ve kapsamı
  - Ekranlar ve işlevler (ekran görüntüleriyle)
  - Veri giriş rehberi (hangi alan ne anlama geliyor)
  - İş akışı örnekleri (sipariş nasıl oluşturulur, üretime nasıl gönderilir)
  - Sık sorulan sorular
- **Admin rehberi**:
  - Kullanıcı ve rol yönetimi
  - Modül aktivasyonu
  - Branding özelleştirme
  - Workflow oluşturma adım adım
  - Kota ve limit yönetimi
  - Denetim kaydı okuma
  - Toplu veri içe aktarma
  - Yazdırma şablonu özelleştirme

### 21C — Geliştirici Dökümantasyonu

- `docs/dev/` altında:
  - Mimari genel bakış (dizin yapısı, teknoloji seçimleri)
  - Veritabanı şeması detaylı açıklama (her tablo, her alan)
  - API endpoint referansı (tüm route'lar, parametreler, yanıtlar)
  - Yeni modül ekleme rehberi (adım adım)
  - Yetki sistemi nasıl çalışır
  - Workflow motoru geliştirici rehberi
  - i18n: yeni dil ekleme rehberi
  - Dosya depolama provider ekleme rehberi
  - IoT API entegrasyon rehberi

- **Çıktı**: Uygulama içi rehber turları çalışır, yardım merkezi erişilebilir, kapsamlı dış döküman hazır

---

## ADIM 22: Onboarding (Karşılama & İlk Kurulum Sihirbazı)

Yeni kayıt olan tenant admin'inin ilk girişte karşılaştığı adım adım kurulum.

- `src/components/onboarding/OnboardingWizard.tsx`: Tam ekran adım adım sihirbaz
- `src/stores/onboarding-store.ts`: Onboarding durumu (tamamlandı mı, hangi adımda)

**Sihirbaz Adımları** (ilk girişte gösterilir):
1. **Hoşgeldiniz**: Kısa tanıtım, ERP'nin yetenekleri
2. **Şirket Bilgileri**: Şirket adı, logo yükleme, sektör seçimi
3. **Branding**: Primary ve secondary renk seçimi (canlı önizleme ile)
4. **Modül Seçimi**: Hangi modülleri kullanmak istiyorsunuz? (kart görünümü, açıklamalı, toggle)
   - Sektöre göre önerilen modüller önceden seçili gelir
5. **İlk Kullanıcılar**: Ekip arkadaşlarınızı davet edin (e-posta listesi, rol atama)
6. **Varsayılan Ayarlar**: Para birimi, tarih formatı, zaman dilimi, dil
7. **Hazırsınız!**: Dashboard'a yönlendirme + kısa rehber tur başlat

- Kullanıcı herhangi bir adımı atlayabilir
- Daha sonra `/dashboard/admin/settings`'ten tamamlanabilir
- Onboarding tamamlanmadıysa her girişte hatırlatıcı banner gösterilir
- İlerleme çubuğu ile kaç adım kaldığı gösterilir

- **Çıktı**: Yeni tenant admin rehberli kurulumla başlar, boş ekranla karşılaşmaz

---

## Modül Listesi & Rota Haritası

| # | Modül | Rota | Adım |
|---|-------|------|------|
| 1 | CRM | /crm | 12 |
| 2 | Üretim Takip | /production | 14 |
| 3 | Kalite PPM | /quality | 16 |
| 4 | Proje Yönetimi | /project | 18 |
| 5 | Ekipman | /equipment | 16 |
| 6 | Stok | /stock | 15 |
| 7 | Malzeme Kütüphanesi | /materials | 15 |
| 8 | 5S Programı | /five-s | 14 |
| 9 | Personel İzin | /leave | 17 |
| 10 | Süreç Takibi | /process-tracking | 18 |
| 11 | Üretim Metot | /production-method | 14 |
| 12 | İş Takibi | /tasks | 18 |
| 13 | Servis Güzergah | /service-routes | 19 |
| 14 | Masraf | /expenses | 19 |
| 15 | Çalışan | /employees | 17 |
| 16 | İşe Alım | /recruitment | 17 |
| 17 | Filo | /fleet | 19 |
| 18 | Satış | /sales | 13 |
| 19 | Mağaza | /retail | 13 |
| 20 | Abonelik | /subscriptions | 13 |
| 21 | Kira | /rent | 19 |
| 22 | Sanal Satış | /virtual-sales | 13 |
| 23 | Saha Hizmetleri | /field-services | 19 |
| 24 | Envanter | /inventory | 15 |
| 25 | Bakım | /maintenance | 16 |
| 26 | IoT | /iot | 20 |
