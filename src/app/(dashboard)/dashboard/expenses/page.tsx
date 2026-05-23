"use client";

import { useState, useEffect, useCallback } from "react";
import { EXPENSE_STATUSES, getExpenseStatus, type Expense, type ExpenseCategory } from "@/lib/ops-types";

const EMPTY = { title: "", amount: 0, currency: "TRY", categoryId: "", expenseDate: new Date().toISOString().slice(0,10), notes: "" };

export default function ExpensesPage() {
  const [expenses,    setExpenses]    = useState<Expense[]>([]);
  const [categories,  setCategories]  = useState<ExpenseCategory[]>([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [statusF,     setStatusF]     = useState("");
  const [totalApproved, setTotalApproved] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async (opts?: { pg?: number; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const st = opts?.st ?? statusF;
    const r = await fetch(`/api/modules/expenses?page=${p}&status=${st}`);
    const d = await r.json() as { expenses: Expense[]; total: number; pages: number; categories: ExpenseCategory[]; totalApproved: number };
    setExpenses(d.expenses); setTotal(d.total); setPages(d.pages);
    setCategories(d.categories); setTotalApproved(d.totalApproved); setLoading(false);
  }, [page, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, categoryId: form.categoryId||undefined }) });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function approve(id: string) {
    await fetch("/api/modules/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved" }) });
    await load();
  }

  async function reject(id: string) {
    await fetch("/api/modules/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "rejected" }) });
    await load();
  }

  const pendingCount = expenses.filter((e) => e.status === "pending").length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-receipt text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">Masraf Yönetimi</h1><p className="text-xs text-slate-400">Kategori, onay ve harcama takibi</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Masraf Ekle
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Toplam Kayıt", value: String(total), icon: "pi-list", color: "#6366f1" },
          { label: "Onaylanan Toplam", value: `${totalApproved.toLocaleString("tr-TR")} TRY`, icon: "pi-money-bill", color: "#10b981" },
          { label: "Bekleyen", value: String(pendingCount), icon: "pi-clock", color: "#f59e0b" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: `${kpi.color}20` }}>
              <i className={`pi ${kpi.icon} text-lg`} style={{ color: kpi.color }} />
            </div>
            <div><p className="text-xl font-bold text-foreground">{kpi.value}</p><p className="text-xs text-slate-400">{kpi.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tümü" }, ...EXPENSE_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
          <button key={opt.value} onClick={() => { setStatusF(opt.value); setPage(1); void load({ pg:1, st: opt.value }); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${statusF === opt.value ? "" : "border-border text-slate-500"}`}
            style={statusF === opt.value ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", border: "1px solid" } : {}}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
              <th className="py-3 px-5 text-left font-medium text-slate-500">Başlık</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Kategori</th>
              <th className="py-3 px-4 text-right font-medium text-slate-500">Tutar</th>
              <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Tarih</th>
              <th className="py-3 px-2 w-28" />
            </tr></thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-slate-400"><i className="pi pi-receipt text-4xl block mb-2 opacity-30" />Masraf yok</td></tr>
              : expenses.map((e) => {
                const es = getExpenseStatus(e.status);
                return (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5"><p className="font-medium text-foreground">{e.title}</p>{e.user && <p className="text-xs text-slate-400">{e.user.name}</p>}</td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{e.category?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">{e.amount.toLocaleString("tr-TR")} {e.currency}</td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${es.bg}`}><i className={`pi ${es.icon} text-xs`} />{es.label}</span></td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{new Date(e.expenseDate).toLocaleDateString("tr-TR")}</td>
                    <td className="py-3 px-2">
                      {e.status === "pending" && <div className="flex gap-1">
                        <button onClick={() => approve(e.id)} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200">Onayla</button>
                        <button onClick={() => reject(e.id)} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs hover:bg-red-200">Reddet</button>
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} kayıt</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">Masraf Ekle</h2><button onClick={() => setModal(false)} className="text-slate-400"><i className="pi pi-times" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tutar *</label><input type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Para Birimi</label>
                  <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {["TRY","USD","EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                  <select value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tarih</label><input type="date" value={form.expenseDate} onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.title || !form.amount} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
