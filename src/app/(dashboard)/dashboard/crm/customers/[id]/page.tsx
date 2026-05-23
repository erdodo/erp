"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PIPELINE_STAGES, INTERACTION_TYPES, getStage, getInteractionType } from "@/lib/crm-types";
import type { CrmCustomer, CrmContact, CrmInteraction } from "@/lib/crm-types";
import PhoneInput from "@/components/ui/PhoneInput";

type Tab = "info" | "contacts" | "interactions";

interface CustomerDetail extends CrmCustomer {
  contacts:     CrmContact[];
  interactions: CrmInteraction[];
  assignedUser: { id: string; name: string; email: string } | null;
}

export default function CustomerDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const searchParams      = useSearchParams();
  const router            = useRouter();
  const [tab, setTab]     = useState<Tab>((searchParams.get("tab") as Tab) ?? "info");
  const [data, setData]   = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // New interaction state
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [intForm, setIntForm] = useState({ type: "call" as string, subject: "", body: "", date: new Date().toISOString().slice(0, 16) });
  const [savingInt, setSavingInt] = useState(false);

  // New contact state
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "", isPrimary: false });
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState("");

  // Edit form
  const [editForm, setEditForm] = useState<Partial<CrmCustomer>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/modules/crm/customers/${id}`);
    if (r.ok) {
      const d = await r.json() as CustomerDetail;
      setData(d);
      setEditForm({
        name: d.name, email: d.email ?? "", phone: d.phone ?? "",
        address: d.address ?? "", city: d.city ?? "", country: d.country,
        taxNumber: d.taxNumber ?? "", taxOffice: d.taxOffice ?? "",
        website: d.website ?? "", pipelineStage: d.pipelineStage,
        tags: d.tags ?? "", notes: d.notes ?? "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "1") setTab("info");
      if (e.key === "2") setTab("contacts");
      if (e.key === "3") setTab("interactions");
      if (e.key === "e") setEditMode((v) => !v);
      if (e.key === "n" && tab === "interactions") setShowAddInteraction(true);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tab]);

  async function saveEdit() {
    setSavingEdit(true);
    const r = await fetch(`/api/modules/crm/customers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
    });
    if (r.ok) { await load(); setEditMode(false); }
    setSavingEdit(false);
  }

  async function changeStage(stage: string) {
    await fetch(`/api/modules/crm/customers/${id}/stage`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineStage: stage }),
    });
    await load();
  }

  async function addInteraction() {
    if (!intForm.subject) return;
    setSavingInt(true);
    await fetch(`/api/modules/crm/customers/${id}/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intForm),
    });
    setIntForm({ type: "call", subject: "", body: "", date: new Date().toISOString().slice(0, 16) });
    setShowAddInteraction(false);
    setSavingInt(false);
    await load();
  }

  async function addContact() {
    if (!contactForm.name) return;
    setContactError("");
    setSavingContact(true);
    const r = await fetch(`/api/modules/crm/customers/${id}/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contactForm),
    });
    if (!r.ok) {
      const err = await r.json() as { error: unknown };
      setContactError(typeof err.error === "string" ? err.error : "Kişi kaydedilemedi. Lütfen tekrar deneyin.");
      setSavingContact(false);
      return;
    }
    setContactForm({ name: "", title: "", email: "", phone: "", isPrimary: false });
    setShowAddContact(false);
    setSavingContact(false);
    await load();
  }

  async function deleteContact(cId: string) {
    if (!confirm("Bu kişiyi silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/crm/customers/${id}/contacts/${cId}`, { method: "DELETE" });
    await load();
  }

  async function deleteCustomer() {
    if (!confirm("Bu müşteriyi silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/crm/customers/${id}`, { method: "DELETE" });
    router.push("/dashboard/crm/customers");
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20 text-slate-400">
      <i className="pi pi-user text-4xl block mb-2 opacity-30" />
      <p>Müşteri bulunamadı</p>
      <Link href="/dashboard/crm/customers" className="text-sm mt-2 inline-block" style={{ color: "var(--color-primary)" }}>
        ← Listeye dön
      </Link>
    </div>
  );

  const stage = getStage(data.pipelineStage);
  const TABS: Array<{ id: Tab; label: string; icon: string; count?: number; hint: string }> = [
    { id: "info",         label: "Bilgiler",     icon: "pi-user",    hint: "1" },
    { id: "contacts",     label: "Kişiler",      icon: "pi-users",   count: data.contacts.length,     hint: "2" },
    { id: "interactions", label: "Etkileşimler", icon: "pi-list",    count: data.interactions.length, hint: "3" },
  ];

  return (
    <div className="pb-8 space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ background: "var(--color-primary)" }}>
            {data.name[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${stage.bg}`}>
                <i className={`pi ${stage.icon} text-xs`} />{stage.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800">
                {data.type === "corporate" ? "Kurumsal" : "Bireysel"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              {data.email && <span className="flex items-center gap-1.5"><i className="pi pi-envelope text-xs" />{data.email}</span>}
              {data.phone && <span className="flex items-center gap-1.5"><i className="pi pi-phone text-xs" />{data.phone}</span>}
              {data.city  && <span className="flex items-center gap-1.5"><i className="pi pi-map-marker text-xs" />{data.city}</span>}
              {data.website && <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline"><i className="pi pi-link text-xs" />{data.website}</a>}
            </div>
            {data.tags && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.tags.split(",").map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 text-xs">{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${editMode ? "border-primary text-primary" : "border-border text-slate-500 hover:bg-slate-50"}`}
              style={editMode ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className="pi pi-pencil text-xs" /> {editMode ? "Düzenleniyor" : "Düzenle"}
              <kbd className="text-xs opacity-40 ml-1">E</kbd>
            </button>
            <button onClick={deleteCustomer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition">
              <i className="pi pi-trash text-xs" />
            </button>
          </div>
        </div>

        {/* Pipeline stage changer */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PIPELINE_STAGES.map((s) => (
            <button key={s.id} onClick={() => changeStage(s.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                data.pipelineStage === s.id ? "text-white border-transparent" : "border-border text-slate-500 hover:border-slate-300 bg-white dark:bg-slate-900"
              }`}
              style={data.pipelineStage === s.id ? { background: s.color, borderColor: s.color } : {}}>
              <i className={`pi ${s.icon} mr-1 text-xs`} />{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Form (inline) */}
      {editMode && (
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">Müşteriyi Düzenle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["name","email","phone","city","taxNumber","taxOffice","website","tags"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field}</label>
                <input value={String(editForm[field] ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <textarea value={String(editForm.notes ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition" style={{ background: "var(--color-primary)" }}>
              {savingEdit ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground"
              }`}
              style={tab === t.id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className={`pi ${t.icon} text-xs`} /> {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}
                  style={tab === t.id ? { background: "var(--color-primary)20", color: "var(--color-primary)" } : {}}>
                  {t.count}
                </span>
              )}
              <kbd className="text-xs opacity-30 font-mono">{t.hint}</kbd>
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Info Tab */}
          {tab === "info" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                ["Tür",         data.type === "corporate" ? "Kurumsal" : "Bireysel"],
                ["E-posta",     data.email],
                ["Telefon",     data.phone],
                ["Adres",       data.address],
                ["Şehir",       data.city],
                ["Ülke",        data.country],
                ["Vergi No",    data.taxNumber],
                ["Vergi Dairesi", data.taxOffice],
                ["Web Sitesi",  data.website],
                ["Atanan",      data.assignedUser?.name],
                ["Oluşturulma", new Date(data.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })],
                ["Güncelleme",  new Date(data.updatedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })],
              ].map(([label, value]) => value && (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-border/50">
                  <span className="text-xs text-slate-400 w-28 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-foreground">{value}</span>
                </div>
              ))}
              {data.notes && (
                <div className="sm:col-span-2 pt-3">
                  <p className="text-xs text-slate-400 mb-1">Notlar</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">{data.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {tab === "contacts" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => setShowAddContact(!showAddContact)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ background: "var(--color-primary)" }}>
                  <i className="pi pi-plus text-xs" /> Kişi Ekle
                </button>
              </div>

              {showAddContact && (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {(["name","title","email","phone"] as const).map((f) => (
                      <div key={f}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          {f === "name" ? "Ad Soyad *" : f === "title" ? "Ünvan" : f === "email" ? "E-posta" : "Telefon"}
                        </label>
                        {f === "phone" ? (
                          <PhoneInput
                            value={contactForm[f]}
                            onChange={(v) => setContactForm((p) => ({ ...p, [f]: v }))}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
                          />
                        ) : (
                          <input
                            value={contactForm[f]}
                            onChange={(e) => setContactForm((p) => ({ ...p, [f]: e.target.value }))}
                            type={f === "email" ? "email" : "text"}
                            placeholder={f === "email" ? "ornek@firma.com" : ""}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm((p) => ({ ...p, isPrimary: e.target.checked }))} className="rounded" />
                    Birincil kişi olarak işaretle
                  </label>
                  {contactError && (
                    <p className="text-xs text-red-600 flex items-center gap-1"><i className="pi pi-exclamation-circle" />{contactError}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddContact(false); setContactError(""); }} className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-slate-100 transition">İptal</button>
                    <button onClick={addContact} disabled={savingContact || !contactForm.name} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                      {savingContact ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                    </button>
                  </div>
                </div>
              )}

              {data.contacts.length === 0 && !showAddContact ? (
                <p className="text-center text-slate-400 text-sm py-8">Henüz kişi eklenmedi</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.contacts.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border p-4 flex items-start gap-3 group hover:border-slate-300 transition">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "var(--color-primary)" }}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{c.name}</p>
                          {c.isPrimary && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Birincil</span>}
                        </div>
                        {c.title && <p className="text-xs text-slate-400">{c.title}</p>}
                        {c.email && <p className="text-xs text-slate-500 mt-1">{c.email}</p>}
                        {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                      </div>
                      <button onClick={() => deleteContact(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition">
                        <i className="pi pi-trash text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interactions Tab */}
          {tab === "interactions" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => setShowAddInteraction(!showAddInteraction)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ background: "var(--color-primary)" }}>
                  <i className="pi pi-plus text-xs" /> Etkileşim Ekle
                  <kbd className="text-xs opacity-70 ml-1">N</kbd>
                </button>
              </div>

              {showAddInteraction && (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tür</label>
                      <select value={intForm.type} onChange={(e) => setIntForm((p) => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                        {INTERACTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tarih</label>
                      <input type="datetime-local" value={intForm.date} onChange={(e) => setIntForm((p) => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Konu *</label>
                      <input value={intForm.subject} onChange={(e) => setIntForm((p) => ({ ...p, subject: e.target.value }))} autoFocus
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Not</label>
                      <textarea value={intForm.body} onChange={(e) => setIntForm((p) => ({ ...p, body: e.target.value }))} rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddInteraction(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-slate-100 transition">İptal</button>
                    <button onClick={addInteraction} disabled={savingInt || !intForm.subject} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                      {savingInt ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                    </button>
                  </div>
                </div>
              )}

              {data.interactions.length === 0 && !showAddInteraction ? (
                <p className="text-center text-slate-400 text-sm py-8">Henüz etkileşim kaydedilmedi</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4 pl-10">
                    {data.interactions.map((item) => {
                      const typeCfg = getInteractionType(item.type);
                      return (
                        <div key={item.id} className="relative">
                          {/* Dot */}
                          <div className="absolute -left-10 w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center"
                            style={{ background: `${typeCfg.color}20`, borderColor: typeCfg.color }}>
                            <i className={`pi ${typeCfg.icon} text-xs`} style={{ color: typeCfg.color }} />
                          </div>
                          <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-3.5 hover:border-slate-300 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-foreground text-sm">{item.subject}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-400">{typeCfg.label}</span>
                                  {item.user && <span className="text-xs text-slate-400">• {item.user.name}</span>}
                                </div>
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">
                                {new Date(item.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            {item.body && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.body}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
