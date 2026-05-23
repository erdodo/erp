"use client";

import { useState, useRef } from "react";

interface Column {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "date" | "email";
}

interface BulkImportProps {
  columns: Column[];
  onImport: (rows: Record<string, unknown>[]) => Promise<{ success: number; errors: { row: number; message: string }[] }>;
  onClose: () => void;
  templateName?: string;
}

type Step = "upload" | "preview" | "result";

export function BulkImport({ columns, onImport, onClose, templateName = "import" }: BulkImportProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: { row: number; message: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const header = columns.map((c) => c.label).join(",");
    const blob = new Blob([header + "\n"], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${templateName}-sablon.csv`;
    a.click();
  }

  function parseCSV(text: string): Record<string, unknown>[] {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0]!.split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",");
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ""; });
      return row;
    });
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    setLoading(true);
    const res = await onImport(rows);
    setResult(res);
    setStep("result");
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <i className="pi pi-upload" style={{ color: "var(--color-primary)" }} /> Toplu İçe Aktar
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
            <i className="pi pi-times text-sm" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-4 text-sm">
          {(["upload", "preview", "result"] as Step[]).map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 ${step === s ? "text-primary font-medium" : "text-slate-400"}`} style={step === s ? { color: "var(--color-primary)" } : {}}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s ? "text-white" : "bg-slate-200 text-slate-500"}`} style={step === s ? { background: "var(--color-primary)" } : {}}>{i + 1}</span>
              {s === "upload" ? "Dosya" : s === "preview" ? "Önizleme" : "Sonuç"}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <i className="pi pi-cloud-upload text-3xl text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">CSV dosyasını sürükleyin veya tıklayın</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:bg-slate-50 transition"
              >
                <i className="pi pi-download" /> Şablon CSV İndir
              </button>
              <div className="text-xs text-slate-400">
                <p className="font-medium mb-1">Beklenen sütunlar:</p>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((c) => (
                    <span key={c.key} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                      {c.label}{c.required ? " *" : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{rows.length} kayıt okundu. Aşağıyı kontrol edin:</p>
              <div className="overflow-auto rounded-lg border border-border max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {columns.map((c) => <th key={c.key} className="px-3 py-2 text-left font-medium text-slate-600">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {columns.map((c) => <td key={c.key} className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{String(row[c.label] ?? row[c.key] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep("upload")} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-slate-50 transition">Geri</button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2"
                  style={{ background: "var(--color-primary)" }}
                >
                  {loading ? <><i className="pi pi-spin pi-spinner" /> Aktarılıyor...</> : <><i className="pi pi-check" /> İçe Aktar ({rows.length})</>}
                </button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <i className="pi pi-check-circle text-2xl text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{result.success} kayıt başarıyla aktarıldı</p>
                  {result.errors.length > 0 && <p className="text-sm text-green-600">{result.errors.length} satırda hata oluştu</p>}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Hatalı Satırlar:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded mb-1">Satır {e.row}: {e.message}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
