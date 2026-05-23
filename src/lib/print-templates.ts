export type TemplateType =
  | "invoice"
  | "delivery"
  | "quote"
  | "order"
  | "leave"
  | "maintenance"
  | "five-s"
  | "custom";

export interface PrintTemplateData {
  type: TemplateType;
  title: string;
  tenantName?: string;
  tenantLogo?: string;
  primaryColor?: string;
  data: Record<string, unknown>;
  columns?: { key: string; label: string }[];
  rows?: Record<string, unknown>[];
  footer?: string;
}

export function renderTemplate(template: PrintTemplateData): string {
  const color = template.primaryColor ?? "#2563eb";
  const logo = template.tenantLogo
    ? `<img src="${template.tenantLogo}" alt="logo" style="height:40px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:700;color:${color};">${template.tenantName ?? "ERP"}</span>`;

  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid ${color};">
      <div>${logo}</div>
      <div style="text-align:right;">
        <h2 style="font-size:22px;font-weight:700;color:${color};margin:0;">${template.title}</h2>
        <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${new Date().toLocaleDateString("tr-TR")}</p>
      </div>
    </div>
  `;

  const dataFields = Object.entries(template.data)
    .map(([key, value]) => `
      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <span style="font-size:12px;color:#64748b;min-width:120px;">${key}:</span>
        <span style="font-size:12px;font-weight:500;color:#0f172a;">${String(value ?? "")}</span>
      </div>
    `).join("");

  const tableHtml = template.columns && template.rows ? `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;">
      <thead>
        <tr style="background:${color};color:white;">
          ${template.columns.map((c) => `<th style="padding:8px 10px;text-align:left;">${c.label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${template.rows.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? "#f8fafc" : "white"};">
            ${template.columns!.map((c) => `<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">${String(row[c.key] ?? "")}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : "";

  const footerHtml = template.footer
    ? `<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">${template.footer}</div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <title>${template.title}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div style="margin-bottom:16px;">${dataFields}</div>
      ${tableHtml}
      ${footerHtml}
    </body>
    </html>
  `;
}

export function printHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}
