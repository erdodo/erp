"use client";

import { useRef } from "react";
import { renderTemplate, printHtml, type PrintTemplateData } from "@/lib/print-templates";

interface PrintPreviewProps {
  template: PrintTemplateData;
  onClose: () => void;
}

export function PrintPreview({ template, onClose }: PrintPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = renderTemplate(template);

  function handlePrint() {
    printHtml(html);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <i className="pi pi-print text-primary" style={{ color: "var(--color-primary)" }} />
            Baskı Önizleme — {template.title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
              style={{ background: "var(--color-primary)" }}
            >
              <i className="pi pi-print" /> Yazdır
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
            >
              <i className="pi pi-times text-sm" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-800">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden max-w-3xl mx-auto">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="w-full border-0"
              style={{ minHeight: "600px" }}
              title="print-preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
