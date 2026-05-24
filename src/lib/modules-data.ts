export interface ModuleDef {
  slug: string;
  name: string;
  nameEn: string;
  icon: string;
  route: string;
  group: string;
  shortcut: string;
  color: string;
}

export const ALL_MODULES: ModuleDef[] = [
  { slug: "crm", name: "CRM", nameEn: "CRM", icon: "pi-users", route: "/dashboard/crm", group: "Satış & Müşteri", shortcut: "C", color: "#2563eb" },
  { slug: "sales", name: "Satış", nameEn: "Sales", icon: "pi-shopping-cart", route: "/dashboard/sales", group: "Satış & Müşteri", shortcut: "S", color: "#16a34a" },
  { slug: "virtual-sales", name: "Sanal Satış", nameEn: "Virtual Sales", icon: "pi-globe", route: "/dashboard/virtual-sales", group: "Satış & Müşteri", shortcut: "V", color: "#7c3aed" },
  { slug: "subscriptions", name: "Abonelik", nameEn: "Subscriptions", icon: "pi-credit-card", route: "/dashboard/subscriptions", group: "Satış & Müşteri", shortcut: "A", color: "#0891b2" },
  { slug: "rental", name: "Mülk & Kira", nameEn: "Properties & Rent", icon: "pi-building", route: "/dashboard/properties", group: "Operasyon", shortcut: "K", color: "#65a30d" },
  { slug: "production", name: "Üretim Takip", nameEn: "Production", icon: "pi-cog", route: "/dashboard/production", group: "Üretim & Kalite", shortcut: "U", color: "#dc2626" },
  { slug: "production-method", name: "Üretim Metot", nameEn: "Production Method", icon: "pi-list", route: "/dashboard/production-method", group: "Üretim & Kalite", shortcut: "T", color: "#b45309" },
  { slug: "five-s", name: "5S Denetim", nameEn: "5S Audit", icon: "pi-check-square", route: "/dashboard/five-s", group: "Üretim & Kalite", shortcut: "F", color: "#7c3aed" },
  { slug: "quality", name: "Kalite PPM", nameEn: "Quality", icon: "pi-verified", route: "/dashboard/quality", group: "Üretim & Kalite", shortcut: "Q", color: "#0e7490" },
  { slug: "equipment", name: "Ekipman", nameEn: "Equipment", icon: "pi-wrench", route: "/dashboard/equipment", group: "Bakım & Altyapı", shortcut: "E", color: "#6d28d9" },
  { slug: "maintenance", name: "Bakım", nameEn: "Maintenance", icon: "pi-calendar", route: "/dashboard/maintenance", group: "Bakım & Altyapı", shortcut: "B", color: "#c2410c" },
  { slug: "stock", name: "Stok", nameEn: "Stock", icon: "pi-box", route: "/dashboard/stock", group: "Stok & Malzeme", shortcut: "ST", color: "#1d4ed8" },
  { slug: "inventory", name: "Envanter", nameEn: "Inventory", icon: "pi-database", route: "/dashboard/inventory", group: "Stok & Malzeme", shortcut: "N", color: "#0f766e" },
  { slug: "materials", name: "Malzeme", nameEn: "Materials", icon: "pi-th-large", route: "/dashboard/materials", group: "Stok & Malzeme", shortcut: "L", color: "#78350f" },
  { slug: "projects", name: "Proje", nameEn: "Projects", icon: "pi-briefcase", route: "/dashboard/projects", group: "Proje & Görev", shortcut: "P", color: "#4f46e5" },
  { slug: "tasks", name: "Görev", nameEn: "Tasks", icon: "pi-check", route: "/dashboard/tasks", group: "Proje & Görev", shortcut: "G", color: "#0369a1" },
  { slug: "employees", name: "Çalışan", nameEn: "Employees", icon: "pi-id-card", route: "/dashboard/employees", group: "İnsan Kaynakları", shortcut: "Y", color: "#065f46" },
  { slug: "recruitment", name: "İşe Alım", nameEn: "Recruitment", icon: "pi-user-plus", route: "/dashboard/recruitment", group: "İnsan Kaynakları", shortcut: "I", color: "#7e22ce" },
  { slug: "leave", name: "İzin Yönetimi", nameEn: "Leave", icon: "pi-calendar-times", route: "/dashboard/leave", group: "İnsan Kaynakları", shortcut: "Z", color: "#be123c" },
  { slug: "okr", name: "OKR Sistemi", nameEn: "OKR System", icon: "pi-compass", route: "/dashboard/okr", group: "İnsan Kaynakları", shortcut: "O", color: "#0d9488" },
  { slug: "expenses", name: "Gider", nameEn: "Expenses", icon: "pi-wallet", route: "/dashboard/expenses", group: "Finans", shortcut: "GD", color: "#b45309" },
  { slug: "process-tracking", name: "Süreç Takibi", nameEn: "Process Tracking", icon: "pi-sitemap", route: "/dashboard/process-tracking", group: "Proje & Görev", shortcut: "SU", color: "#1e40af" },
  { slug: "service-routes", name: "Güzergah", nameEn: "Service Routes", icon: "pi-map", route: "/dashboard/service-routes", group: "Operasyon", shortcut: "GU", color: "#065f46" },
  { slug: "fleet", name: "Filo", nameEn: "Fleet", icon: "pi-car", route: "/dashboard/fleet", group: "Operasyon", shortcut: "FL", color: "#374151" },
  { slug: "field-services", name: "Saha Hizmet", nameEn: "Field Service", icon: "pi-map-marker", route: "/dashboard/field-services", group: "Operasyon", shortcut: "SH", color: "#0891b2" },
  { slug: "api-keys", name: "API Anahtarları", nameEn: "API Keys", icon: "pi-key", route: "/dashboard/api-keys", group: "Teknoloji", shortcut: "AK", color: "#374151" },
  { slug: "iot", name: "IoT", nameEn: "IoT", icon: "pi-wifi", route: "/dashboard/iot", group: "Teknoloji", shortcut: "IO", color: "#7c3aed" },
];

export const MODULE_GROUPS = Array.from(new Set(ALL_MODULES.map((m) => m.group)));

export function getModuleDef(slug: string): ModuleDef | undefined {
  return ALL_MODULES.find((m) => m.slug === slug);
}
