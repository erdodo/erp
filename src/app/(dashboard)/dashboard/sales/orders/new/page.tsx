"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, TAX_RATES, DISCOUNT_MATRIX, type SalesProduct } from "@/lib/sales-types";

interface LineItem {
  key:        string;
  stockItemId: string;
  name:       string;
  unit:       string;
  quantity:   number;
  unitPrice:  number;
  stock?:     number;
}

interface Customer { id: string; name: string; type: string; email: string | null }
interface SimpleStore { id: string; name: string }

export default function NewOrderPage() {
  const router = useRouter();

  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [products,    setProducts]    = useState<SalesProduct[]>([]);
  const [stores,      setStores]      = useState<SimpleStore[]>([]);
  const [customerId,  setCustomerId]  = useState("");
  const [storeId, setStoreId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [salespeople, setSalespeople] = useState<[{id:string; name:string}]>([]);
  const [channel, setChannel] = useState("virtual"); // "virtual" or "store"
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceFee, setMaintenanceFee] = useState(0);
  const [triggerProduction, setTriggerProduction] = useState(false);

  const [status,      setStatus]      = useState("draft");
  const [currency,    setCurrency]    = useState("TRY");
  const [discount,    setDiscount]    = useState(0);
  const [tax,         setTax]         = useState(20);
  const [notes,       setNotes]       = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items,       setItems]       = useState<LineItem[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadCustomers = useCallback(async () => {
    const r = await fetch("/api/modules/crm/customers?limit=100");
    const d = await r.json() as { customers: Customer[] };
    setCustomers(d.customers);
  }, []);

  const loadProducts = useCallback(async () => {
    const r = await fetch("/api/modules/sales/products?limit=100");
    const d = await r.json() as { products: SalesProduct[] };
    setProducts(d.products);
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadProducts();
    fetch("/api/modules/retail").then((r) => r.ok ? r.json() : { stores: [] }).then((d: { stores: SimpleStore[] }) => setStores(d.stores ?? []));
  }, [loadCustomers, loadProducts]);

  useEffect(() => {
    // Fetch salespeople for selection
    fetch("/api/modules/users?role=salesperson")
      .then((r) => r.json())
      .then((data) => setSalespeople(data.salespeople ?? []))
      .catch(() => {});
  }, []);

  // Auto-apply discount based on customer type + quantity
  useEffect(() => {
    const customer = customers.find((c) => c.id === customerId);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    let pct = 0;
    if (customer?.type === "corporate") pct += DISCOUNT_MATRIX[0].discountPct;
    if (totalQty >= 100) pct += DISCOUNT_MATRIX[3].discountPct;
    else if (totalQty >= 50) pct += DISCOUNT_MATRIX[2].discountPct;
    else if (totalQty >= 10) pct += DISCOUNT_MATRIX[1].discountPct;
    setDiscount(Math.min(pct, 30)); // cap at 30%
  }, [customerId, items, customers]);

  function addProduct(p: SalesProduct) {
    setItems((prev) => {
      const ex = prev.find((i) => i.stockItemId === p.id);
      if (ex) return prev.map((i) => i.stockItemId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { key: p.id + Date.now(), stockItemId: p.id, name: p.name, unit: p.unit, quantity: 1, unitPrice: p.cost ?? 0, stock: p.quantity }];
    });
    setShowProductPicker(false); setProductSearch("");
  }

  function addManual() {
    setItems((prev) => [...prev, { key: "manual-" + Date.now(), stockItemId: "", name: "", unit: "adet", quantity: 1, unitPrice: 0 }]);
  }

  function updateItem(key: string, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, [field]: value } : i));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const subtotal    = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = subtotal * (discount / 100);
  const taxBase     = subtotal - discountAmt;
  const taxAmt      = taxBase * (tax / 100);
  const total       = taxBase + taxAmt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("En az bir ürün/hizmet eklemelisiniz."); return; }
    if (items.some((i) => !i.name)) { setError("Tüm kalemlerin adı dolu olmalıdır."); return; }
    setSaving(true); setError("");
    const payload = {
      customerId: customerId || undefined,
      retailStoreId: channel === "store" ? storeId || undefined : undefined,
      channel,
      salespersonId: salespersonId || undefined,
      maintenanceDate: maintenanceDate || undefined,
      maintenanceFee: maintenanceFee || undefined,
      triggerProduction,
      status,
      currency,
      discount,
      tax,
      notes: notes || undefined,
      deliveryDate: deliveryDate || undefined,
      items: items.map((i) => ({
        stockItemId: i.stockItemId || undefined,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
      })),
    };
    const r = await fetch("/api/modules/sales/orders", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (r.ok) {
      const d = await r.json() as { id: string };
      router.push(`/dashboard/sales/orders/${d.id}`);
    } else {
      setError("Kaydedilemedi."); setSaving(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="pb-8 max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Info */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Sipariş Bilgileri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Müşteri</label>
                 <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                   <option value="">— Müşteri seçin (opsiyonel) —</option>
                   {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === "corporate" ? "Kurumsal" : "Bireysel"})</option>)}
                 </select>
                 {selectedCustomer && (
                   <p className="mt-1 text-xs text-slate-400">
                     {selectedCustomer.type === "corporate" ? "🏢 B2B — kurumsal iskonto otomatik uygulanır" : "👤 Bireysel müşteri"}
                   </p>
                 )}
               </div>
               <div className="col-span-1">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Kanal</label>
                 <select value={channel} onChange={(e) => setChannel(e.target.value as "virtual" | "store")}
                   className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                   <option value="virtual">Sanal</option>
                   <option value="store">Mağaza</option>
                 </select>
               </div>
               {channel === "store" && (
                 <div className="col-span-1">
                   <label className="block text-xs font-medium text-slate-500 mb-1">İlgili Mağaza</label>
                   <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                     <option value="">— Mağaza seçin (opsiyonel) —</option>
                     {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>
               )}
               <div className="col-span-1">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Satıcı</label>
                 <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none cursor-pointer">
                   <option value="">— Satıcı seçin (opsiyonel) —</option>
                   {salespeople.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                 </select>
               </div>
               <div className="col-span-1">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Bakım Tarihi</label>
                 <input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
               </div>
               <div className="col-span-1">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Bakım Ücreti</label>
                 <input type="number" min="0" step="0.01" value={maintenanceFee}
                   onChange={(e) => setMaintenanceFee(parseFloat(e.target.value) || 0)}
                   className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
               </div>
               <div className="col-span-1 flex items-center">
                 <input type="checkbox" id="triggerProd" checked={triggerProduction} onChange={(e) => setTriggerProduction(e.target.checked)}
                   className="mr-2" />
                 <label htmlFor="triggerProd" className="block text-xs font-medium text-slate-500">Üretimi Tetikle</label>
               </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Kalemler</h2>
            <div className="flex gap-2">
              <div className="relative">
                <button type="button" onClick={() => setShowProductPicker(!showProductPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-slate-50 transition text-foreground">
                  <i className="pi pi-box text-xs" /> Katalogdan Ekle
                </button>
                {showProductPicker && (
                  <div className="absolute right-0 top-10 w-80 z-50 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl">
                    <div className="p-2 border-b border-border">
                      <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} autoFocus
                        placeholder="Ürün ara…" className="w-full px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none" />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredProducts.length === 0 ? <p className="px-3 py-4 text-sm text-slate-400 text-center">Ürün bulunamadı</p> :
                        filteredProducts.map((p) => (
                          <button key={p.id} type="button" onClick={() => addProduct(p)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0">
                            <div>
                              <p className="font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.sku ?? ""} · {p.quantity} {p.unit} stok</p>
                            </div>
                            <span className="text-xs font-semibold text-foreground">{p.cost?.toLocaleString("tr-TR") ?? "—"} {p.currency}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
              <button type="button" onClick={addManual}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-border hover:bg-slate-50 transition text-slate-500">
                <i className="pi pi-plus text-xs" /> Manuel Ekle
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <i className="pi pi-shopping-cart text-3xl block mb-2 opacity-30" />
              <p className="text-sm">Katalogdan ürün seçin veya manuel kalem ekleyin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-3 font-medium text-slate-500 min-w-48">Ürün / Hizmet</th>
                    <th className="pb-2 pr-3 font-medium text-slate-500 w-24">Birim</th>
                    <th className="pb-2 pr-3 font-medium text-slate-500 w-24">Miktar</th>
                    <th className="pb-2 pr-3 font-medium text-slate-500 w-32">Birim Fiyat</th>
                    <th className="pb-2 pr-3 font-medium text-slate-500 w-32 text-right">Toplam</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        <input value={item.name} onChange={(e) => updateItem(item.key, "name", e.target.value)} required
                          placeholder="Ürün / hizmet adı"
                          className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none focus:ring-1"
                          style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties} />
                        {item.stock !== undefined && item.stock < item.quantity && (
                          <p className="text-xs text-amber-600 mt-0.5"><i className="pi pi-exclamation-triangle text-xs mr-1" />Stokta {item.stock} {item.unit} var</p>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <input value={item.unit} onChange={(e) => updateItem(item.key, "unit", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none" placeholder="adet" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                          onChange={(e) => updateItem(item.key, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none text-right" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="0.01" value={item.unitPrice}
                          onChange={(e) => updateItem(item.key, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none text-right" />
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-foreground">
                        {(item.quantity * item.unitPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeItem(item.key)} className="text-slate-400 hover:text-red-500 transition">
                          <i className="pi pi-times text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals + Discount Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discount Matrix */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
            <h2 className="font-semibold text-foreground mb-3">İskonto Matrisi</h2>
            <div className="space-y-2 mb-4">
              {DISCOUNT_MATRIX.map((rule, i) => {
                const customer = customers.find((c) => c.id === customerId);
                const totalQty = items.reduce((s, it) => s + it.quantity, 0);
                let autoActive = false;
                if (i === 0 && customer?.type === "corporate") autoActive = true;
                if (i === 1 && totalQty >= 10 && totalQty < 50) autoActive = true;
                if (i === 2 && totalQty >= 50 && totalQty < 100) autoActive = true;
                if (i === 3 && totalQty >= 100) autoActive = true;
                const selected = discount === rule.discountPct;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDiscount(rule.discountPct)}
                    title={`%${rule.discountPct} iskonto uygula`}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left border ${
                      selected
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : autoActive
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {selected && <i className="pi pi-check text-xs text-emerald-500" />}
                      {!selected && autoActive && <i className="pi pi-star-fill text-xs text-blue-400" />}
                      {rule.label}
                    </span>
                    <span className="font-bold">{rule.discountPct}%</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">İskonto % (otomatik veya manüel)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">KDV</label>
                <select value={tax} onChange={(e) => setTax(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  {TAX_RATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-foreground mb-4">Özet</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-500"><span>Ara Toplam</span><span className="font-medium text-foreground">{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>İskonto (-%{discount})</span><span>-{discountAmt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span></div>}
                {tax > 0 && <div className="flex justify-between text-slate-500"><span>KDV (%{tax})</span><span>{taxAmt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span></div>}
                <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                  <span>Genel Toplam</span><span style={{ color: "var(--color-primary)" }}>{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <i className="pi pi-exclamation-triangle" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-slate-50 transition">İptal</button>
          <button type="submit" disabled={saving || items.length === 0} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition" style={{ background: "var(--color-primary)" }}>
            {saving ? <><i className="pi pi-spin pi-spinner mr-2" />Kaydediliyor…</> : "Siparişi Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
