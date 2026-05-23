import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  companyName: z.string().min(2).max(200),
});

const MODULES = [
  "crm", "sales", "retail", "virtual-sales", "subscriptions", "rental",
  "production", "production-method", "five-s", "quality", "equipment",
  "maintenance", "stock", "inventory", "materials", "projects", "tasks",
  "employees", "recruitment", "leave", "expenses", "process-flow",
  "service-routes", "fleet", "field-service", "iot",
];

const ACTIONS = ["view", "create", "update", "delete", "export"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanımda." }, { status: 409 });
    }

    const slug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50) + "-" + Date.now().toString(36);

    const hashedPassword = await hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          currency: "TRY",
          language: "tr",
          isActive: true,
          onboardingDone: false,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Yönetici",
          description: "Tam yetkili yönetici rolü",
          isDefault: false,
        },
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Kullanıcı",
          description: "Standart kullanıcı rolü",
          isDefault: true,
        },
      });

      for (const mod of MODULES) {
        for (const action of ACTIONS) {
          const perm = await tx.permission.upsert({
            where: { module_action: { module: mod, action } },
            update: {},
            create: { module: mod, action, description: `${mod}:${action}` },
            select: { id: true },
          });
          if (perm.id) {
            await tx.rolePermission.create({
              data: { roleId: adminRole.id, permissionId: perm.id },
            });
          }
        }
      }

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          tenantId: tenant.id,
          isAdmin: true,
          isActive: true,
          roleId: adminRole.id,
        },
      });

      for (let i = 0; i < MODULES.length; i++) {
        await tx.tenantModule.create({
          data: { tenantId: tenant.id, module: MODULES[i]!, isActive: false, sortOrder: i },
        });
      }

      const defaultQuotas = [
        { resource: "employees", maxCount: 50 },
        { resource: "customers", maxCount: 500 },
        { resource: "projects", maxCount: 20 },
        { resource: "sales", maxCount: 1000 },
        { resource: "warehouses", maxCount: 5 },
        { resource: "users", maxCount: 25 },
      ];
      for (const quota of defaultQuotas) {
        await tx.tenantQuota.create({
          data: { tenantId: tenant.id, ...quota, currentCount: 0, isUnlimited: false },
        });
      }

      return { user, tenant };
    });

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
      tenantId: result.tenant.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues ?? [];
      const msg = issues[0]?.message ?? "Geçersiz veri";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[REGISTER]", err);
    return NextResponse.json({ error: "Kayıt sırasında bir hata oluştu." }, { status: 500 });
  }
}
