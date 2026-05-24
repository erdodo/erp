"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RentalProperty } from "@/lib/ops-types";

type Tab = "overview" | "leases" | "employees" | "sales" | "inventory" | "equipments" | "production";

interface StoreEmployee { id: string; name: string; position: string | null; email: string | null; phone: string | null; employeeNo: string }
interface StoreExpense { id: string; title: string; amount: number; currency: string; status: string; expenseDate: string }
interface StoreSubscription { id: string; name: string; plan: string | null; amount: number; currency: string; status: string; nextRenewal: string | null }
interface RetailTransaction { id: string; type: string; totalAmount: number; currency: string; paymentMethod: string; receiptNo: string | null; transactedAt: string }
interface Sale { id: string; saleNo: string; orderDate: string; totalAmount: number; currency: string; status: string; customer?: { name: string } | null }
interface StockItem { id: string; name: string; sku: string | null; category: string | null; quantity: number; minQuantity: number; unit: string; cost: number | null; currency: string }
interface StockMovement { id: string; type: string; quantity: number; reason: string | null; createdAt: string; item: { name: string } }
interface Equipment { id: string; code: string; name: string; brand: string | null; model: string | null; status: string; notes: string | null }
interface ProductionLine { id: string; name: string; isActive: boolean }
interface ProductionOrder { id: string; orderNo: string; quantity: number; status: string; createdAt: string; line?: { name: string } | null }

interface PropertyDetail {
  property: RentalProperty;
  contracts: any[];
  employees: StoreEmployee[];
  expenses: StoreExpense[];
  subscriptions: StoreSubscription[];
  transactions: RetailTransaction[];
  sales: Sale[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  equipments: Equipment[];
  productionLines: ProductionLine[];
  productionOrders: ProductionOrder[];
  stats: {
    monthlyRevenue: number;
    totalRevenue: number;
    contractsCount: number;
    employeesCount: number;
    stockCount: number;
    equipmentsCount: number;
  };
}

const PROP_LABELS: Record<string, string> = {
  office: "Ofis",
  warehouse: "Depo / Antrepo",
  retail: "Perakende Mağaza",
  factory: "Fabrika / Üretim Alanı",
  residential: "Konut / Daire",
  land: "Arazi / Arsa",
  other: "Diğer",
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    tenantName: "",
    amount: 0,
    currency: "TRY",
    startDate: "",
    endDate: "",
  });
  const [savingContract, setSavingContract] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/modules/properties/${id}`);
      if (r.ok) {
        setData(await r.json() as PropertyDetail);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveContract() {
    if (!contractForm.tenantName || !contractForm.amount || !contractForm.startDate) return;
    setSavingContract(true);
    try {
      await fetch("/api/modules/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contract",
          propertyId: id,
          ...contractForm,
        }),
      });
      setShowContractModal(false);
      setContractForm({
        tenantName: "",
        amount: 0,
        currency: "TRY",
        startDate: "",
        endDate: "",
      });
      await load();
    } catch (e) {
      console.error(e);
    }
    setSavingContract(false);
  }

  async function markPaid(paymentId: string) {
    try {
      await fetch("/api/modules/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment", id: paymentId }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  async function markContractInactive(contractId: string) {
    if (!confirm("Bu sözleşmeyi sonlandırmak istediğinizden emin misiniz?")) return;
    try {
      await fetch("/api/modules/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contract", id: contractId }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <i className="pi pi-spin pi-spinner text-4xl mb-2" style={{ color: "var(--color-primary)" }} />
        <p className="text-sm">Detaylar yükleniyor...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-400">
        <i className="pi pi-exclamation-triangle text-4xl mb-3 block" />
        <p>Mülk bulunamadı</p>
        <Link href="/dashboard/properties" className="text-sm mt-3 inline-block font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
          ← Listeye dön
        </Link>
      </div>
    );
  }

  const { property, contracts, employees, expenses, subscriptions, transactions, sales, stockItems, stockMovements, equipments, productionLines, productionOrders, stats } = data;
  const activeContract = contracts.find((c) => c.isActive);

  // Tabs based on dynamic connections
  const availableTabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Genel Bakış", icon: "pi-home" },
    { id: "leases", label: "Kira & Sözleşme", icon: "pi-percentage" },
  ];

  if (property.storeId) {
    availableTabs.push({ id: "employees", label: "Çalışanlar", icon: "pi-users" });
    availableTabs.push({ id: "sales", label: "Satış & Kasa", icon: "pi-receipt" });
  }

  if (property.warehouseId || property.type === "warehouse") {
    availableTabs.push({ id: "inventory", label: "Stok & Envanter", icon: "pi-box" });
  }

  availableTabs.push({ id: "equipments", label: "Ekipmanlar", icon: "pi-wrench" });

  if (property.type === "factory" || property.type === "production") {
    availableTabs.push({ id: "production", label: "Üretim Takip", icon: "pi-cog" });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Upper Cover Card */}
      <div className="rounded-3xl border border-border bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shrink-0" style={{ background: "var(--color-primary)" }}>
              <i className="pi pi-building" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-xl font-bold text-foreground">{property.name}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold uppercase">
                  {PROP_LABELS[property.type] ?? property.type}
                </span>
                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  property.ownershipType === "owned_by_us"
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : property.ownershipType === "rented_from_landlord"
                    ? activeContract ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                    : activeContract ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                }`}>
                  {property.ownershipType === "owned_by_us" ? "ÖZ MÜLK" : property.ownershipType === "rented_from_landlord" ? (activeContract ? "KİRALADIĞIMIZ" : "SÖZLEŞMESİZ") : (activeContract ? "KİRADA" : "BOŞ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
                {property.address && <span className="flex items-center gap-1.5"><i className="pi pi-map-marker text-xs text-primary" />{property.address}</span>}
                {property.area && <span className="flex items-center gap-1.5"><i className="pi pi-th-large text-xs text-primary" />{property.area} m²</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/properties"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <i className="pi pi-arrow-left text-xs" /> Geri
            </Link>
          </div>
        </div>

        {/* Dynamic Quick Stat KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/60">
          {[
            {
              label: property.ownershipType === "owned_by_us" ? "Mülkiyet Durumu" : property.ownershipType === "rented_from_landlord" ? "Aylık Kira Gideri" : "Aylık Kira Geliri",
              value: property.ownershipType === "owned_by_us" ? "Kendi Kullanımımız" : activeContract ? `₺${activeContract.amount.toLocaleString("tr-TR")}` : "₺0",
              icon: "pi-percentage",
              color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20"
            },
            { label: "Personel Sayısı", value: stats.employeesCount, icon: "pi-users", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" },
            { label: "Kayıtlı Ekipman", value: stats.equipmentsCount, icon: "pi-wrench", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
            {
              label: property.ownershipType === "owned_by_us" ? "Kullanım Şekli" : "Kira Sözleşmesi",
              value: property.ownershipType === "owned_by_us" ? "Öz Mülk" : `${stats.contractsCount} adet`,
              icon: "pi-file-o",
              color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20"
            },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-xl border border-border/80 p-3.5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <i className={`pi ${stat.icon} text-base`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-base font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="rounded-3xl border border-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="flex border-b border-border bg-slate-50/50 dark:bg-slate-950/20 overflow-x-auto">
          {availableTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground"
              }`}
              style={tab === t.id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}
            >
              <i className={`pi ${t.icon} text-xs`} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="p-6">
          {/* 1. Overview */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Mülk Detay Bilgileri
                  </h3>
                  <div className="rounded-2xl border border-border/80 p-4 space-y-3 divide-y divide-border/40 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-medium">Mülk Adı:</span>
                      <span className="text-foreground font-semibold">{property.name}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 font-medium">Mülk Tipi:</span>
                      <span className="text-foreground font-semibold capitalize">{PROP_LABELS[property.type] ?? property.type}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 font-medium">Alan (m²):</span>
                      <span className="text-foreground font-semibold">{property.area ? `${property.area} m²` : "Belirtilmemiş"}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 font-medium">Adres:</span>
                      <span className="text-foreground font-semibold text-right max-w-xs">{property.address || "Belirtilmemiş"}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 font-medium">Oluşturulma:</span>
                      <span className="text-foreground font-semibold">
                        {new Date(property.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Entegrasyon Durumları
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className={`rounded-2xl border p-4 flex items-start gap-3.5 ${
                      property.storeId ? "border-orange-200 bg-orange-50/20" : "border-border bg-slate-50/40"
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        property.storeId ? "bg-orange-500 text-white shadow-sm" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                      }`}>
                        <i className="pi pi-shop" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Perakende Mağaza Modülü</p>
                        <p className="text-[11px] text-slate-500">
                          {property.storeId ? `Bağlı Mağaza: ${property.store?.name}` : "Bu mülke bağlı perakende mağazası bulunmuyor. Perakende işlemlerini, personel atamalarını ve gelirlerini bu mülkle bağlamak için tipi Mağaza yapıp yeni bir modül açın."}
                        </p>
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-4 flex items-start gap-3.5 ${
                      property.warehouseId ? "border-teal-200 bg-teal-50/20" : "border-border bg-slate-50/40"
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        property.warehouseId ? "bg-teal-600 text-white shadow-sm" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                      }`}>
                        <i className="pi pi-box" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Stok & Depo Envanter Modülü</p>
                        <p className="text-[11px] text-slate-500">
                          {property.warehouseId ? `Bağlı Depo: ${property.warehouse?.name}` : "Bu mülke bağlı envanter deposu bulunmuyor. Depo stok sayımlarını, giriş/çıkış ve envanter detaylarını bağlamak için tipi Depo yapıp yeni bir modül açın."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Leases */}
          {tab === "leases" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> {
                    property.ownershipType === "owned_by_us" ? "Mülkiyet & Kullanım Bilgisi"
                    : property.ownershipType === "rented_from_landlord" ? "Kiralama Sözleşmesi Detayı"
                    : "Kira Sözleşmesi Detayı"
                  }
                </h3>
                {property.ownershipType !== "owned_by_us" && !activeContract && (
                  <button
                    onClick={() => setShowContractModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <i className="pi pi-plus text-[10px]" /> {property.ownershipType === "rented_from_landlord" ? "Yeni Sözleşme Tanımla" : "Yeni Sözleşme Yap"}
                  </button>
                )}
              </div>

              {property.ownershipType === "owned_by_us" ? (
                <div className="text-center py-16 border border-dashed border-border bg-slate-50/40 dark:bg-slate-800/10 rounded-2xl p-6">
                  <i className="pi pi-home text-4xl text-slate-300 dark:text-slate-700 mb-3 block" />
                  <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">Kendi Kullanımımızda (Öz Mülk)</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Bu mülk şirketimizin öz kullanımında olduğundan aktif bir kira sözleşmesi veya kiralama ödemesi takibi bulunmamaktadır.</p>
                </div>
              ) : !activeContract ? (
                <div className="text-center py-12 border border-dashed border-border bg-slate-50/40 dark:bg-slate-800/10 rounded-2xl p-6">
                  <i className="pi pi-percentage text-4xl text-slate-300 dark:text-slate-700 mb-3 block" />
                  <p className="text-slate-500 font-semibold text-sm">
                    {property.ownershipType === "rented_from_landlord" ? "Aktif Kiralama Sözleşmesi Yok" : "Aktif Kira Sözleşmesi Yok"}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {property.ownershipType === "rented_from_landlord" ? "Bu mülk için kiraladığınız mülk sahibiyle yaptığınız kira sözleşmesini tanımlayın ve ödemelerinizi takip edin." : "Bu mülkü kiralamak ve kira ödemelerini başlatmak için sözleşme oluşturun."}
                  </p>
                  <button
                    onClick={() => setShowContractModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-sm"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {property.ownershipType === "rented_from_landlord" ? "Kiralama Sözleşmesi Tanımla" : "Kira Sözleşmesi Tanımla"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    property.ownershipType === "rented_from_landlord" ? "border-indigo-100 bg-indigo-50/10 dark:border-indigo-950/20 dark:bg-indigo-950/5 text-indigo-700" : "border-emerald-100 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5 text-emerald-700"
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-base">{activeContract.tenantName}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          property.ownershipType === "rented_from_landlord" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {property.ownershipType === "rented_from_landlord" ? "BİZ BİZ KİRACIYIZ" : "KİRACIDA"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold">
                        {property.ownershipType === "rented_from_landlord" ? "Kiralama Süresi: " : "Sözleşme Süresi: "}
                        {new Date(activeContract.startDate).toLocaleDateString("tr-TR")} 
                        {activeContract.endDate ? ` — ${new Date(activeContract.endDate).toLocaleDateString("tr-TR")}` : " (Belirsiz Süreli)"}
                      </p>
                      {activeContract.notes && <p className="text-xs text-slate-500 mt-1 italic">"{activeContract.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {property.ownershipType === "rented_from_landlord" ? "Aylık Ödenen Kira" : "Aylık Kira Bedeli"}
                        </p>
                        <p className={`text-xl font-bold ${
                          property.ownershipType === "rented_from_landlord" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>{activeContract.amount.toLocaleString("tr-TR")} {activeContract.currency}</p>
                      </div>
                      <button
                        onClick={() => markContractInactive(activeContract.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-950 bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition"
                      >
                        Sözleşmeyi Bitir
                      </button>
                    </div>
                  </div>

                  {/* Payment Schedules */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <i className="pi pi-calendar text-xs" style={{ color: "var(--color-primary)" }} /> Kira Ödeme Planı (Taksitler)
                    </h4>
                    {activeContract.payments && activeContract.payments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {activeContract.payments.map((p: any) => {
                          const isOverdue = p.status === "pending" && new Date(p.dueDate) < new Date();
                          return (
                            <div
                              key={p.id}
                              className={`rounded-xl border p-3 flex flex-col justify-between gap-3 ${
                                p.status === "paid"
                                  ? "border-emerald-100 bg-emerald-50/20 dark:border-emerald-950/20 dark:bg-emerald-950/5 text-emerald-700 dark:text-emerald-400"
                                  : isOverdue
                                  ? "border-rose-100 bg-rose-50/20 dark:border-rose-950/20 dark:bg-rose-950/5 text-rose-700 dark:text-rose-400"
                                  : "border-border bg-slate-50/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                  {new Date(p.dueDate).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                  p.status === "paid" ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {p.status === "paid" ? "ÖDENDİ" : isOverdue ? "VADESİ GEÇTİ" : "BEKLİYOR"}
                                </span>
                              </div>

                              <div className="flex items-end justify-between gap-2">
                                <div>
                                  <p className="text-[10px] text-slate-400 font-medium">Vade: {new Date(p.dueDate).toLocaleDateString("tr-TR")}</p>
                                  <p className="text-sm font-bold text-foreground">{p.amount.toLocaleString("tr-TR")} {p.currency}</p>
                                </div>
                                {p.status === "pending" && (
                                  <button
                                    onClick={() => markPaid(p.id)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                                  >
                                    Öde
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Ödeme planı tanımlanmamış</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Employees */}
          {tab === "employees" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Çalışan Personel
                </h3>
                <Link
                  href="/dashboard/employees"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <i className="pi pi-external-link text-[10px]" /> HR Personel Sayfasına Git
                </Link>
              </div>

              {employees.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs">
                  Bu mağazada atanmış çalışan personel bulunmuyor.<br />HR modülünden çalışanların işyeri alanını bu mülk/mağaza olarak güncelleyebilirsiniz.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {employees.map((emp) => (
                    <div key={emp.id} className="rounded-2xl border border-border p-4 flex items-start gap-3 hover:shadow-xs transition duration-150 bg-slate-50/20 dark:bg-slate-900/40">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs" style={{ background: "var(--color-primary)" }}>
                        {emp.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div>
                          <p className="font-bold text-foreground text-sm leading-tight line-clamp-1">{emp.name}</p>
                          {emp.position && <p className="text-[10px] text-slate-400 font-semibold">{emp.position}</p>}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">Sicil: {emp.employeeNo}</p>
                        <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                          {emp.phone && <p className="flex items-center gap-1"><i className="pi pi-phone text-[10px]" /> {emp.phone}</p>}
                          {emp.email && <p className="flex items-center gap-1 line-clamp-1"><i className="pi pi-envelope text-[10px]" /> {emp.email}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Sales */}
          {tab === "sales" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Mağaza Satış & Kasa Raporu
                </h3>
                <div className="rounded-xl border border-border p-3 flex items-center gap-2.5">
                  <i className="pi pi-shopping-cart text-lg text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Toplam Mağaza Geliri</p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">₺{stats.totalRevenue.toLocaleString("tr-TR")}</p>
                  </div>
                </div>
              </div>

              {transactions.length === 0 && sales.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs">Bu mağazaya ait henüz satış işlemi bulunmuyor.</p>
              ) : (
                <div className="space-y-6">
                  {/* Retail POS Transactions */}
                  {transactions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <i className="pi pi-tablet text-xs" /> Kasa İşlemleri (POS)
                      </h4>
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                              <th className="p-3">Tarih</th>
                              <th className="p-3">Tür</th>
                              <th className="p-3">Ödeme Tipi</th>
                              <th className="p-3 text-right">Tutar</th>
                              <th className="p-3">Fiş No</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {transactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="p-3 text-slate-500">{new Date(tx.transactedAt).toLocaleString("tr-TR")}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.type === "sale" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                    {tx.type === "sale" ? "Satış" : "İade"}
                                  </span>
                                </td>
                                <td className="p-3 uppercase text-slate-500">{tx.paymentMethod}</td>
                                <td className="p-3 text-right font-extrabold text-foreground">{tx.totalAmount.toLocaleString("tr-TR")} {tx.currency}</td>
                                <td className="p-3 font-mono text-slate-400">{tx.receiptNo ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Standard B2B/B2C Sales */}
                  {sales.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <i className="pi pi-shopping-bag text-xs" /> Standart Satış Siparişleri
                      </h4>
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                              <th className="p-3">Tarih</th>
                              <th className="p-3">Sipariş No</th>
                              <th className="p-3">Müşteri</th>
                              <th className="p-3">Durum</th>
                              <th className="p-3 text-right">Tutar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {sales.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="p-3 text-slate-500">{new Date(s.orderDate).toLocaleDateString("tr-TR")}</td>
                                <td className="p-3 font-semibold text-foreground">{s.saleNo}</td>
                                <td className="p-3 text-slate-600">{s.customer?.name || "Bireysel Müşteri"}</td>
                                <td className="p-3">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    s.status === "completed" || s.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                  }`}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-extrabold text-foreground">{s.totalAmount.toLocaleString("tr-TR")} {s.currency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Inventory */}
          {tab === "inventory" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Depo Stok Durumu
              </h3>

              {stockItems.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs">Bu mülkle ilişkili depoda kayıtlı stok öğesi bulunmuyor.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stock list table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Depo Envanter Kartları</h4>
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                              <th className="p-3">Öğe / Ürün</th>
                              <th className="p-3">Kategori</th>
                              <th className="p-3 text-right">Miktar</th>
                              <th className="p-3 text-right">Kritik Limit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {stockItems.map((item) => {
                              const isLow = item.quantity <= item.minQuantity;
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                  <td className="p-3 font-semibold text-foreground">
                                    <div className="space-y-0.5">
                                      <p>{item.name}</p>
                                      {item.sku && <p className="text-[9px] text-slate-400 font-mono">SKU: {item.sku}</p>}
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-400 font-medium capitalize">{item.category || "—"}</td>
                                  <td className="p-3 text-right">
                                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                                      isLow ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "text-foreground"
                                    }`}>
                                      {item.quantity.toLocaleString("tr-TR")} {item.unit}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right text-slate-400">{item.minQuantity} {item.unit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Stock Movements */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Son Envanter Hareketleri</h4>
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                              <th className="p-3">Tarih</th>
                              <th className="p-3">Hareket</th>
                              <th className="p-3">Ürün</th>
                              <th className="p-3 text-right">Miktar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {stockMovements.map((move) => (
                              <tr key={move.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="p-3 text-slate-400">{new Date(move.createdAt).toLocaleString("tr-TR")}</td>
                                <td className="p-3">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    move.type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  }`}>
                                    {move.type === "in" ? "GİRİŞ" : "ÇIKIŞ"}
                                  </span>
                                </td>
                                <td className="p-3 text-foreground font-medium">{move.item?.name}</td>
                                <td className={`p-3 text-right font-bold ${move.type === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                                  {move.type === "in" ? "+" : "-"}{move.quantity.toLocaleString("tr-TR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Equipments */}
          {tab === "equipments" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Bu Konumdaki Ekipmanlar
              </h3>

              {equipments.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs">
                  Bu mülk konumunda atanmış fiziksel ekipman bulunmuyor.<br />Ekipmanlar modülünden ekipmanların lokasyonunu <b>"{property.name}"</b> olarak güncellerseniz burada listelenir.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {equipments.map((eq) => (
                    <div key={eq.id} className="rounded-2xl border border-border p-4 flex flex-col justify-between gap-3 bg-slate-50/20 dark:bg-slate-900/40">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-foreground text-sm line-clamp-1">{eq.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            eq.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Kod: {eq.code}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {eq.brand || eq.model ? `${eq.brand || ""} ${eq.model || ""}` : "—"}
                        </p>
                      </div>
                      {eq.notes && (
                        <div className="text-[10px] text-slate-400 border-t border-border/40 pt-2 italic line-clamp-1">
                          "{eq.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. Production */}
          {tab === "production" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 rounded-xs" style={{ background: "var(--color-primary)" }} /> Üretim & Fabrika Durumu
              </h3>

              {productionLines.length === 0 && productionOrders.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs">Aktif üretim hattı veya emir bulunmuyor.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Production Lines */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Aktif Üretim Hatları</h4>
                    <div className="space-y-2">
                      {productionLines.map((line) => (
                        <div key={line.id} className="rounded-xl border border-border p-3.5 flex items-center justify-between gap-2 bg-slate-50/20">
                          <span className="font-semibold text-foreground text-xs">{line.name}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase">
                            AKTİF ÇALIŞIYOR
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Production Orders */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Son Üretim Emirleri</h4>
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                            <th className="p-3">Emir No</th>
                            <th className="p-3">Üretim Hattı</th>
                            <th className="p-3">Miktar</th>
                            <th className="p-3 text-right">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {productionOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="p-3 font-semibold text-foreground">{ord.orderNo}</td>
                              <td className="p-3 text-slate-400">{ord.line?.name || "—"}</td>
                              <td className="p-3 font-bold text-foreground">{ord.quantity.toLocaleString("tr-TR")} adet</td>
                              <td className="p-3 text-right">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                  ord.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Lease Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {property.ownershipType === "rented_from_landlord" ? "Yeni Kiralama Sözleşmesi Yap" : "Yeni Kira Sözleşmesi Yap"}
              </h2>
              <button
                onClick={() => setShowContractModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <i className="pi pi-times text-xs" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  {property.ownershipType === "rented_from_landlord" ? "Mülk Sahibi / Kiralayan Adı *" : "Kiracı Adı *"}
                </label>
                <input
                  type="text"
                  value={contractForm.tenantName}
                  onChange={(e) => setContractForm((f) => ({ ...f, tenantName: e.target.value }))}
                  placeholder={property.ownershipType === "rented_from_landlord" ? "ör. Ahmet Yılmaz (Mülk Sahibi)" : "ör. Ahmet Yılmaz veya Şirket Ünvanı"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {property.ownershipType === "rented_from_landlord" ? "Aylık Ödenen Kira *" : "Aylık Kira Bedeli *"}
                  </label>
                  <input
                    type="number"
                    value={contractForm.amount}
                    onChange={(e) => setContractForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                    placeholder="ör. 25000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Döviz *</label>
                  <div className="relative">
                    <select
                      value={contractForm.currency}
                      onChange={(e) => setContractForm((f) => ({ ...f, currency: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      {["TRY", "USD", "EUR"].map((cur) => (
                        <option key={cur} value={cur}>{cur}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowContractModal(false)}
                className="px-4.5 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
              >
                İptal
              </button>
              <button
                onClick={saveContract}
                disabled={savingContract || !contractForm.tenantName || !contractForm.amount || !contractForm.startDate}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition shadow-sm"
                style={{ background: "var(--color-primary)" }}
              >
                {savingContract ? (
                  <span className="flex items-center gap-1.5">
                    <i className="pi pi-spin pi-spinner" /> Oluşturuluyor
                  </span>
                ) : (
                  "Sözleşmeyi Başlat"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
