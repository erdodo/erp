"use client";

import { useState } from "react";
import { DATA_SOURCES, getSourceFields } from "@/lib/dashboard-data-client";
import type { WidgetConfig, ChartType, AggType } from "@/lib/dashboard-data-client";

interface WidgetWizardProps {
  layoutId: string;
  onClose: () => void;
  onCreated: () => void;
}

const WIDGET_TYPES = [
  { id: "stat",  label: "İstatistik", desc: "Tek sayısal değer",       icon: "pi-chart-bar" },
  { id: "chart", label: "Grafik",     desc: "Bar, çizgi, pasta grafik", icon: "pi-chart-pie" },
  { id: "table", label: "Tablo",      desc: "Satır tabanlı liste",      icon: "pi-table" },
  { id: "list",  label: "Liste",      desc: "Basit veri listesi",       icon: "pi-list" },
];

const CHART_TYPES: Array<{ id: ChartType; label: string }> = [
  { id: "bar",      label: "Sütun" },
  { id: "line",     label: "Çizgi" },
  { id: "pie",      label: "Pasta" },
  { id: "doughnut", label: "Halka" },
];

const AGG_TYPES: Array<{ id: AggType; label: string }> = [
  { id: "count", label: "Sayı (Count)" },
  { id: "sum",   label: "Toplam (Sum)" },
  { id: "avg",   label: "Ortalama (Avg)" },
];

const ICONS = ["pi-chart-bar","pi-users","pi-box","pi-check","pi-bell","pi-briefcase","pi-shopping-cart","pi-star","pi-bolt","pi-tag"];
const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#64748b"];

export function WidgetWizard({ layoutId, onClose, onCreated }: WidgetWizardProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [widgetType, setWidgetType] = useState("stat");
  const [source, setSource] = useState(DATA_SOURCES[0].id);
  const [cfg, setCfg] = useState<Partial<WidgetConfig>>({
    aggregate: "count", chartType: "bar", sortDir: "desc", limit: 20,
    icon: "pi-chart-bar", color: "#6366f1",
  });
  const [saving, setSaving] = useState(false);

  const fields = getSourceFields(source);
  const numericFields = fields.filter((f) => f.type === "number");

  async function handleFinish() {
    if (!title) return;
    setSaving(true);

    const config: WidgetConfig = { source, ...cfg };

    await fetch(`/api/dashboard/layouts/${layoutId}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type:       widgetType,
        dataSource: source,
        config,
        x: 0, y: 999, // append to bottom
        w: widgetType === "stat" ? 3 : widgetType === "list" ? 3 : 6,
        h: widgetType === "stat" ? 2 : 4,
      }),
    });

    setSaving(false);
    onCreated();
  }

  const steps = ["Tür", "Veri Kaynağı", "Yapılandır", "Başlık"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-foreground">Widget Ekle</h3>
            <p className="text-xs text-slate-400 mt-0.5">{steps[step]} — Adım {step + 1}/{steps.length}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
        </div>

        {/* Progress */}
        <div className="flex px-6 pt-4 gap-1 shrink-0">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              style={i <= step ? { background: "var(--color-primary)" } : {}} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Widget Type */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map((t) => (
                <button key={t.id} onClick={() => setWidgetType(t.id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition text-left ${widgetType === t.id ? "border-primary bg-blue-50/40 dark:bg-blue-900/10" : "border-border hover:border-slate-300"}`}
                  style={widgetType === t.id ? { borderColor: "var(--color-primary)" } : {}}>
                  <i className={`pi ${t.icon} text-xl`} style={widgetType === t.id ? { color: "var(--color-primary)" } : { color: "#64748b" }} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Data Source */}
          {step === 1 && (
            <div className="space-y-2">
              {DATA_SOURCES.map((src) => (
                <button key={src.id} onClick={() => setSource(src.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition ${source === src.id ? "border-primary" : "border-border hover:border-slate-300"}`}
                  style={source === src.id ? { borderColor: "var(--color-primary)" } : {}}>
                  <i className="pi pi-database text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{src.label}</p>
                    <p className="text-xs text-slate-400">{src.fields.length} alan</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-4">
              {widgetType === "stat" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Hesaplama</label>
                    <select value={cfg.aggregate} onChange={(e) => setCfg({ ...cfg, aggregate: e.target.value as AggType })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                      {AGG_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  {(cfg.aggregate === "sum" || cfg.aggregate === "avg") && numericFields.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Alan</label>
                      <select value={cfg.aggregateField} onChange={(e) => setCfg({ ...cfg, aggregateField: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                        {numericFields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">İkon</label>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map((ic) => (
                        <button key={ic} onClick={() => setCfg({ ...cfg, icon: ic })}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center border transition ${cfg.icon === ic ? "border-primary bg-blue-50" : "border-border hover:bg-slate-50"}`}
                          style={cfg.icon === ic ? { borderColor: "var(--color-primary)" } : {}}>
                          <i className={`pi ${ic} text-sm`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Renk</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setCfg({ ...cfg, color: c })}
                          className={`w-7 h-7 rounded-full border-2 transition ${cfg.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {widgetType === "chart" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Grafik Türü</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CHART_TYPES.map((ct) => (
                        <button key={ct.id} onClick={() => setCfg({ ...cfg, chartType: ct.id })}
                          className={`py-2 text-xs font-medium rounded-lg border transition ${cfg.chartType === ct.id ? "border-primary text-primary" : "border-border text-slate-500 hover:border-slate-300"}`}
                          style={cfg.chartType === ct.id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Gruplama Alanı</label>
                    <select value={cfg.groupByField ?? ""} onChange={(e) => setCfg({ ...cfg, groupByField: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                      <option value="">Seçin...</option>
                      {fields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Gösterilecek kayıt sayısı</label>
                    <input type="number" min={3} max={20} value={cfg.limit ?? 10}
                      onChange={(e) => setCfg({ ...cfg, limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                  </div>
                </>
              )}

              {(widgetType === "table" || widgetType === "list") && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Gösterilecek Alanlar</label>
                    <div className="space-y-1">
                      {fields.map((f) => {
                        const selected = (cfg.columns ?? []).includes(f.name);
                        return (
                          <label key={f.name} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                            <input type="checkbox" checked={selected} onChange={() => {
                              const cols = cfg.columns ?? [];
                              setCfg({ ...cfg, columns: selected ? cols.filter((c) => c !== f.name) : [...cols, f.name] });
                            }} className="rounded" />
                            {f.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Sıralama Alanı</label>
                    <select value={cfg.sortField ?? "createdAt"} onChange={(e) => setCfg({ ...cfg, sortField: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                      {fields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Kayıt Sayısı</label>
                    <input type="number" min={5} max={100} value={cfg.limit ?? 20}
                      onChange={(e) => setCfg({ ...cfg, limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Title */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Widget Başlığı</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Toplam Müşteri Sayısı"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" autoFocus />
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-500 space-y-1">
                <p><span className="font-medium text-foreground">Tür:</span> {WIDGET_TYPES.find((t) => t.id === widgetType)?.label}</p>
                <p><span className="font-medium text-foreground">Kaynak:</span> {DATA_SOURCES.find((s) => s.id === source)?.label}</p>
                {widgetType === "stat" && <p><span className="font-medium text-foreground">Hesaplama:</span> {AGG_TYPES.find((a) => a.id === cfg.aggregate)?.label}</p>}
                {widgetType === "chart" && <p><span className="font-medium text-foreground">Grafik:</span> {CHART_TYPES.find((c) => c.id === cfg.chartType)?.label}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          {step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">Geri</button>
          ) : (
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition" style={{ background: "var(--color-primary)" }}>İleri</button>
          ) : (
            <button onClick={handleFinish} disabled={!title || saving} className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
