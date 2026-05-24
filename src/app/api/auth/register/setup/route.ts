import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { REGISTER_ACTIONS, REGISTER_DEFAULT_QUOTAS, REGISTER_MODULES } from "@/lib/register-setup";

const setupSchema = z.object({
  tenantId: z.string().cuid(),
  step: z.enum(["permissions", "rolePermissions", "tenantModules", "quotas", "mockData"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, step } = setupSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı." }, { status: 404 });
    }

    switch (step) {
      case "permissions": {
        const permissionData = REGISTER_MODULES.flatMap((module) =>
          REGISTER_ACTIONS.map((action) => ({
            where: { module_action: { module, action } },
            update: {},
            create: { module, action, description: `${module}:${action}` },
          }))
        );

        await Promise.all(
          permissionData.map((perm) => prisma.permission.upsert(perm))
        );
        return NextResponse.json({ success: true });
      }

      case "rolePermissions": {
        const adminRole = await prisma.role.findFirst({
          where: { tenantId, name: "Yönetici" },
        });
        if (!adminRole) {
          return NextResponse.json({ error: "Admin rolü bulunamadı." }, { status: 404 });
        }

        const permissions = await prisma.permission.findMany({
          where: { module: { in: REGISTER_MODULES } },
          select: { id: true },
        });

        if (permissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: adminRole.id,
              permissionId: permission.id,
            })),
            skipDuplicates: true,
          });
        }

        return NextResponse.json({ success: true });
      }

      case "tenantModules": {
        await Promise.all(
          REGISTER_MODULES.map((module, index) =>
            prisma.tenantModule.upsert({
              where: { tenantId_module: { tenantId, module } },
              update: {},
              create: {
                tenantId,
                module,
                isActive: false,
                sortOrder: index,
              },
            })
          )
        );
        return NextResponse.json({ success: true });
      }

      case "quotas": {
        await prisma.tenantQuota.createMany({
          data: REGISTER_DEFAULT_QUOTAS.map((quota) => ({
            tenantId,
            resource: quota.resource,
            maxCount: quota.maxCount,
            currentCount: 0,
            isUnlimited: false,
          })),
          skipDuplicates: true,
        });
        return NextResponse.json({ success: true });
      }

      case "mockData": {
        const adminUser = await prisma.user.findFirst({
          where: { tenantId, isAdmin: true },
          select: { id: true, name: true },
        });

        if (!adminUser) {
          return NextResponse.json({ error: "Admin kullanıcı bulunamadı." }, { status: 404 });
        }

        const customers = await prisma.customer.createMany({
          data: [
            {
              tenantId,
              name: "Akım Enerji A.Ş.",
              email: "info@akimenerji.com",
              phone: "0555 123 45 67",
              address: "Ataşehir, İstanbul",
              city: "İstanbul",
              country: "TR",
              pipelineStage: "lead",
            },
            {
              tenantId,
              name: "Bora Lojistik",
              email: "iletisim@boraloji.com",
              phone: "0555 987 65 43",
              address: "Gebze, Kocaeli",
              city: "Kocaeli",
              country: "TR",
              pipelineStage: "negotiation",
            },
          ],
          skipDuplicates: true,
        });

        const [firstCustomer] = await prisma.customer.findMany({
          where: { tenantId },
          take: 1,
        });

        const project = await prisma.project.create({
          data: {
            tenantId,
            name: "Web Sitesi Yenileme",
            description: "Kurumsal web sitesi yeniden tasarımı.",
            status: "planning",
            progress: 20,
            currency: "TRY",
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            managerId: adminUser.id,
            customerId: firstCustomer?.id,
          },
        });

        await prisma.task.createMany({
          data: [
            {
              tenantId,
              projectId: project.id,
              title: "Teklif Hazırlığı",
              description: "Müşteri için proje teklifini hazırlayın.",
              status: "todo",
              priority: "high",
              assignedTo: adminUser.id,
              createdBy: adminUser.id,
              dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            },
            {
              tenantId,
              projectId: project.id,
              title: "Başlangıç Toplantısı",
              description: "Müşteri ile proje başlangıç toplantısı düzenleyin.",
              status: "todo",
              priority: "medium",
              assignedTo: adminUser.id,
              createdBy: adminUser.id,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          ],
        });

        await prisma.employee.createMany({
          data: [
            {
              tenantId,
              employeeNo: "EMP-001",
              name: "Burak Yıldız",
              position: "Satış Müdürü",
              email: "burak.yildiz@erp.local",
              phone: "0555 222 33 44",
              departmentId: null,
            },
            {
              tenantId,
              employeeNo: "EMP-002",
              name: "Meryem Kaya",
              position: "Proje Yöneticisi",
              email: "meryem.kaya@erp.local",
              phone: "0555 333 44 55",
              departmentId: null,
            },
          ],
          skipDuplicates: true,
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Bilinmeyen adım." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues ?? [];
      const msg = issues[0]?.message ?? "Geçersiz veri";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("[REGISTER SETUP]", err);
    return NextResponse.json({ error: "Kurulum sırasında bir hata oluştu." }, { status: 500 });
  }
}
