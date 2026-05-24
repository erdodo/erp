"use client";

import { useState, FormEvent } from "react";

export interface QuickAddField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  dialogTitle: string;
  fields: QuickAddField[];
  apiEndpoint: string;
  onCreated: (item: Record<string, unknown>) => void;
  addPageUrl?: string;
  className?: string;
}

function isElectron(): boolean {
  return typeof window !== "undefined" && typeof (window as Window & { electron?: { isElectron?: boolean } }).electron !== "undefined";
}

export default function QuickAddSelect({
  label, value, onChange, options, placeholder,
  dialogTitle, fields, apiEndpoint, onCreated, addPageUrl, className,
}: Props) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [form,   setForm]   = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""]))
  );

  function handlePlusClick() {
    if (isElectron() && addPageUrl) {
      window.open(addPageUrl, "_blank");
      return;
    }
    setForm(Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])));
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    const r = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const created = await r.json() as Record<string, unknown>;
      onCreated(created);
      setOpen(false);
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? "Kaydedilemedi.");
    }
    setSaving(false);
  }

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
        <div className="flex gap-1.5">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className ?? "flex-1 px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer focus:outline-none"}
          >
            <option value="">{placeholder ?? "— Seçin (opsiyonel) —"}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            onClick={handlePlusClick}
            title={`Yeni ${dialogTitle} ekle`}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:border-primary hover:text-primary transition text-slate-400 shrink-0"
            style={{ "--hover-color": "var(--color-primary)" } as React.CSSProperties}
          >
            <i className="pi pi-plus text-xs" />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <i className="pi pi-plus-circle text-sm" style={{ color: "var(--color-primary)" }} />
                {dialogTitle} Ekle
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <i className="pi pi-times text-xs" />
              </button>
            </div>

            <div
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              className="p-5 space-y-3"
            >
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {f.label}{f.required && " *"}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      required={f.required}
                      className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none"
                    />
                  ) : (
                    <input
                      type={f.type ?? "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required={f.required}
                      className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none"
                    />
                  )}
                </div>
              ))}

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle" />{error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-slate-50 transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition"
                  style={{ background: "var(--color-primary)" }}
                >
                  {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
