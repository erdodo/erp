import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: path.resolve(process.cwd(), "prisma/dev.db"),
});
const prisma = new PrismaClient({ adapter });

const MODULES = [
  "crm", "sales", "retail", "virtual-sales", "subscriptions", "rental",
  "production", "production-method", "five-s", "quality", "equipment",
  "maintenance", "stock", "inventory", "materials", "projects", "tasks",
  "employees", "recruitment", "leave", "expenses", "process-flow",
  "service-routes", "fleet", "field-service", "iot",
];

const ACTIONS = ["view", "create", "update", "delete", "export"];

async function main() {
  console.log("🌱 Seeding database...");

  // SuperAdmin user
  const superAdminPassword = await hash("SuperAdmin123!", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@erp.local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@erp.local",
      password: superAdminPassword,
      isSuperAdmin: true,
      isAdmin: true,
      isActive: true,
    },
  });
  console.log("✅ SuperAdmin:", superAdmin.email);

  // Default permissions
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, description: `${module}:${action}` },
      });
    }
  }
  console.log("✅ Permissions:", MODULES.length * ACTIONS.length, "records");

  // Demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Şirket A.Ş.",
      slug: "demo",
      currency: "TRY",
      language: "tr",
      isActive: true,
      onboardingDone: true,
    },
  });
  console.log("✅ Demo tenant:", demoTenant.slug);

  // Demo admin user
  const adminPassword = await hash("Admin123!", 12);
  const demoAdmin = await prisma.user.upsert({
    where: { email: "admin@demo.erp" },
    update: {},
    create: {
      name: "Demo Admin",
      email: "admin@demo.erp",
      password: adminPassword,
      tenantId: demoTenant.id,
      isAdmin: true,
      isActive: true,
    },
  });
  console.log("✅ Demo admin:", demoAdmin.email);

  // Default role for demo tenant
  const adminRole = await prisma.role.upsert({
    where: { id: `role_admin_${demoTenant.id}` },
    update: {},
    create: {
      id: `role_admin_${demoTenant.id}`,
      tenantId: demoTenant.id,
      name: "Yönetici",
      description: "Tam yetkili yönetici rolü",
      isDefault: false,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { id: `role_user_${demoTenant.id}` },
    update: {},
    create: {
      id: `role_user_${demoTenant.id}`,
      tenantId: demoTenant.id,
      name: "Kullanıcı",
      description: "Standart kullanıcı rolü",
      isDefault: true,
    },
  });
  console.log("✅ Roles:", adminRole.name, userRole.name);

  // Assign all permissions to admin role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log("✅ Admin role permissions assigned");

  // Update admin user with admin role
  await prisma.user.update({
    where: { id: demoAdmin.id },
    data: { roleId: adminRole.id },
  });

  // Default tenant modules (all disabled by default, enable a few for demo)
  const demoActiveModules = ["crm", "sales", "projects", "tasks", "employees", "stock", "expenses"];
  for (const module of MODULES) {
    await prisma.tenantModule.upsert({
      where: { tenantId_module: { tenantId: demoTenant.id, module } },
      update: {},
      create: {
        tenantId: demoTenant.id,
        module,
        isActive: demoActiveModules.includes(module),
        sortOrder: MODULES.indexOf(module),
      },
    });
  }
  console.log("✅ Tenant modules configured");

  // Default quotas for demo tenant
  const defaultQuotas = [
    { resource: "employees", maxCount: 50 },
    { resource: "customers", maxCount: 500 },
    { resource: "projects", maxCount: 20 },
    { resource: "sales", maxCount: 1000 },
    { resource: "warehouses", maxCount: 5 },
    { resource: "users", maxCount: 25 },
  ];
  for (const quota of defaultQuotas) {
    await prisma.tenantQuota.upsert({
      where: { tenantId_resource: { tenantId: demoTenant.id, resource: quota.resource } },
      update: {},
      create: { tenantId: demoTenant.id, ...quota, currentCount: 0, isUnlimited: false },
    });
  }
  console.log("✅ Default quotas configured");

  console.log("\n🎉 Seed completed!");
  console.log("─────────────────────────────");
  console.log("SuperAdmin: superadmin@erp.local / SuperAdmin123!");
  console.log("Demo Admin: admin@demo.erp / Admin123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
