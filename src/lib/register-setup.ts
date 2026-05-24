export const REGISTER_MODULES = [
  "crm", "sales", "retail", "virtual-sales", "subscriptions", "rental",
  "production", "production-method", "five-s", "quality", "equipment",
  "maintenance", "stock", "inventory", "materials", "projects", "tasks",
  "employees", "recruitment", "leave", "expenses", "process-flow",
  "service-routes", "fleet", "field-service", "iot", "okr",
];

export const REGISTER_ACTIONS = ["view", "create", "update", "delete", "export"];

export const REGISTER_DEFAULT_QUOTAS = [
  { resource: "employees", maxCount: 50 },
  { resource: "customers", maxCount: 500 },
  { resource: "projects", maxCount: 20 },
  { resource: "sales", maxCount: 1000 },
  { resource: "warehouses", maxCount: 5 },
  { resource: "users", maxCount: 25 },
];
