import type { ToolDefinition } from "./types";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (sent to Gemini) ───────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "navigate_to",
    description: "Kullanıcıyı uygulamada belirli bir sayfaya yönlendir.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Hedef sayfa yolu, örn: /dashboard/crm/customers" },
        label: { type: "string", description: "Buton etiketi, örn: Müşterilere Git" },
      },
      required: ["url", "label"],
    },
  },
  {
    name: "list_customers",
    description: "CRM müşteri listesini sorgula.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Ad veya e-posta ile arama" },
        type: { type: "string", enum: ["corporate", "individual"], description: "Müşteri tipi" },
        limit: { type: "number", description: "Maksimum kayıt sayısı (varsayılan 10)" },
      },
    },
  },
  {
    name: "create_customer",
    description: "Yeni müşteri kaydı oluştur.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Müşteri adı veya şirket adı" },
        type: { type: "string", enum: ["corporate", "individual"], description: "Müşteri tipi" },
        email: { type: "string", description: "E-posta adresi" },
        phone: { type: "string", description: "Telefon numarası" },
        city: { type: "string", description: "Şehir" },
        taxNumber: { type: "string", description: "Vergi numarası" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_employees",
    description: "İK çalışan listesini sorgula.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Ad ile arama" },
        department: { type: "string", description: "Departman adı filtresi" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_employee",
    description: "Yeni çalışan kaydı oluştur.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Çalışan adı soyadı" },
        email: { type: "string" },
        phone: { type: "string" },
        position: { type: "string", description: "Pozisyon / unvan" },
        hireDate: { type: "string", description: "İşe giriş tarihi (YYYY-MM-DD)" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_vehicles",
    description: "Filo araç listesini sorgula.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Plaka veya marka ile arama" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_vehicle",
    description: "Filoya yeni araç ekle.",
    parameters: {
      type: "object",
      properties: {
        plate: { type: "string", description: "Plaka numarası" },
        brand: { type: "string", description: "Araç markası" },
        model: { type: "string", description: "Araç modeli" },
        year: { type: "number", description: "Model yılı" },
        fuelType: { type: "string", description: "Yakıt tipi (benzin/dizel/elektrik/hibrit)" },
        status: { type: "string", description: "Araç durumu (active/maintenance/inactive)" },
      },
      required: ["plate"],
    },
  },
  {
    name: "list_stock",
    description: "Stok kalemlerini sorgula.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        lowStock: { type: "boolean", description: "Sadece düşük stok kalemlerini getir" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "list_production_orders",
    description: "Üretim emirlerini sorgula.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["planned", "in_progress", "completed", "cancelled"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_production_order",
    description: "Yeni üretim emri oluştur.",
    parameters: {
      type: "object",
      properties: {
        productName: { type: "string", description: "Üretilecek ürün adı" },
        quantity: { type: "number", description: "Üretim miktarı" },
        unit: { type: "string", description: "Birim (adet/kg/litre vs.)" },
        plannedStart: { type: "string", description: "Planlanan başlangıç tarihi (YYYY-MM-DD)" },
        plannedEnd: { type: "string", description: "Planlanan bitiş tarihi (YYYY-MM-DD)" },
      },
      required: ["productName", "quantity"],
    },
  },
  {
    name: "list_tasks",
    description: "Görev listesini sorgula.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "in_progress", "done", "cancelled"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_task",
    description: "Yeni görev oluştur.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Görev başlığı" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        dueDate: { type: "string", description: "Son tarih (YYYY-MM-DD)" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_dashboard_summary",
    description: "ERP sisteminin genel özet istatistiklerini getir (müşteri, çalışan, üretim, stok sayıları).",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_sales",
    description: "Satış siparişlerini sorgula.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "confirmed", "delivered", "cancelled"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_sale",
    description: "Yeni satış siparişi oluştur.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Müşteri adı (sistemde aranır)" },
        items: {
          type: "array",
          description: "Sipariş kalemleri",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
          },
        },
        notes: { type: "string" },
      },
      required: ["items"],
    },
  },
];

// ─── Tool Executor (server-side, has Prisma access) ──────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  tenantId: string
): Promise<{ result: unknown; clientActions?: Array<{ type: string; url?: string; label?: string }> }> {
  switch (name) {
    case "navigate_to": {
      return {
        result: `Kullanıcı ${args.url as string} sayfasına yönlendiriliyor.`,
        clientActions: [{ type: "navigate", url: args.url as string, label: args.label as string }],
      };
    }

    case "list_customers": {
      const limit = (args.limit as number) ?? 10;
      const customers = await prisma.customer.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(args.search ? { name: { contains: args.search as string } } : {}),
          ...(args.type ? { type: args.type as string } : {}),
        },
        select: { id: true, name: true, email: true, phone: true, type: true, pipelineStage: true, city: true },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return { result: { count: customers.length, customers } };
    }

    case "create_customer": {
      const customer = await prisma.customer.create({
        data: {
          tenantId,
          name: args.name as string,
          type: (args.type as string) ?? "corporate",
          email: (args.email as string) ?? null,
          phone: (args.phone as string) ?? null,
          city: (args.city as string) ?? null,
          taxNumber: (args.taxNumber as string) ?? null,
        },
        select: { id: true, name: true, type: true },
      });
      return {
        result: { success: true, customer },
        clientActions: [{ type: "navigate", url: "/dashboard/crm/customers", label: "Müşterileri Gör" }],
      };
    }

    case "list_employees": {
      const limit = (args.limit as number) ?? 10;
      const employees = await prisma.employee.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
          ...(args.search ? { name: { contains: args.search as string } } : {}),
        },
        select: { id: true, name: true, position: true, email: true, phone: true, employeeNo: true },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return { result: { count: employees.length, employees } };
    }

    case "create_employee": {
      const count = await prisma.employee.count({ where: { tenantId } });
      const employee = await prisma.employee.create({
        data: {
          tenantId,
          employeeNo: `EMP-${String(count + 1).padStart(4, "0")}`,
          name: args.name as string,
          email: (args.email as string) ?? null,
          phone: (args.phone as string) ?? null,
          position: (args.position as string) ?? null,
          hireDate: args.hireDate ? new Date(args.hireDate as string) : null,
        },
        select: { id: true, name: true, employeeNo: true, position: true },
      });
      return {
        result: { success: true, employee },
        clientActions: [{ type: "navigate", url: "/dashboard/employees", label: "Çalışanları Gör" }],
      };
    }

    case "list_vehicles": {
      const limit = (args.limit as number) ?? 10;
      const vehicles = await prisma.vehicle.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(args.search
            ? {
                OR: [
                  { plate: { contains: args.search as string } },
                  { brand: { contains: args.search as string } },
                ],
              }
            : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return { result: { count: vehicles.length, vehicles } };
    }

    case "create_vehicle": {
      const vehicle = await prisma.vehicle.create({
        data: {
          tenantId,
          plate: args.plate as string,
          brand: (args.brand as string) ?? null,
          model: (args.model as string) ?? null,
          year: (args.year as number) ?? null,
          fuelType: (args.fuelType as string) ?? "gasoline",
          status: (args.status as string) ?? "active",
        },
      });
      return {
        result: { success: true, vehicle: { id: vehicle.id, plate: vehicle.plate, brand: vehicle.brand } },
        clientActions: [{ type: "navigate", url: "/dashboard/fleet", label: "Filoya Git" }],
      };
    }

    case "list_stock": {
      const limit = (args.limit as number) ?? 10;
      const items = await prisma.stockItem.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
          ...(args.search ? { name: { contains: args.search as string } } : {}),
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, sku: true, quantity: true, minQuantity: true, unit: true },
      });
      const filtered = args.lowStock ? items.filter((i) => i.quantity <= i.minQuantity) : items;
      return { result: { count: filtered.length, items: filtered } };
    }

    case "list_production_orders": {
      const limit = (args.limit as number) ?? 10;
      const orders = await prisma.productionOrder.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(args.status ? { status: args.status as string } : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNo: true, productName: true, quantity: true, unit: true, status: true, plannedStart: true },
      });
      return { result: { count: orders.length, orders } };
    }

    case "create_production_order": {
      const count = await prisma.productionOrder.count({ where: { tenantId } });
      const order = await prisma.productionOrder.create({
        data: {
          tenantId,
          orderNo: `PO-${String(count + 1).padStart(5, "0")}`,
          productName: args.productName as string,
          quantity: args.quantity as number,
          unit: (args.unit as string) ?? "adet",
          plannedStart: args.plannedStart ? new Date(args.plannedStart as string) : null,
          plannedEnd: args.plannedEnd ? new Date(args.plannedEnd as string) : null,
        },
        select: { id: true, orderNo: true, productName: true, quantity: true, status: true },
      });
      return {
        result: { success: true, order },
        clientActions: [{ type: "navigate", url: "/dashboard/production/orders", label: "Üretim Emirlerine Git" }],
      };
    }

    case "list_tasks": {
      const limit = (args.limit as number) ?? 10;
      const tasks = await prisma.task.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(args.status ? { status: args.status as string } : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
      });
      return { result: { count: tasks.length, tasks } };
    }

    case "create_task": {
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: args.title as string,
          description: (args.description as string) ?? null,
          priority: (args.priority as string) ?? "medium",
          dueDate: args.dueDate ? new Date(args.dueDate as string) : null,
        },
        select: { id: true, title: true, priority: true, status: true },
      });
      return {
        result: { success: true, task },
        clientActions: [{ type: "navigate", url: "/dashboard/tasks", label: "Görevlere Git" }],
      };
    }

    case "get_dashboard_summary": {
      const [customers, employees, prodOrders, stockItems, sales] = await Promise.all([
        prisma.customer.count({ where: { tenantId, deletedAt: null } }),
        prisma.employee.count({ where: { tenantId, deletedAt: null, isActive: true } }),
        prisma.productionOrder.count({ where: { tenantId, deletedAt: null, status: "in_progress" } }),
        prisma.stockItem.count({ where: { tenantId, deletedAt: null, isActive: true } }),
        prisma.sale.count({ where: { tenantId, deletedAt: null } }),
      ]);
      return {
        result: {
          customers,
          activeEmployees: employees,
          activeProductionOrders: prodOrders,
          stockItems,
          totalSales: sales,
        },
      };
    }

    case "list_sales": {
      const limit = (args.limit as number) ?? 10;
      const sales = await prisma.sale.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(args.status ? { status: args.status as string } : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, saleNo: true, status: true, totalAmount: true, currency: true, orderDate: true, customer: { select: { name: true } } },
      });
      return { result: { count: sales.length, sales } };
    }

    case "create_sale": {
      let customerId: string | null = null;
      if (args.customerName) {
        const c = await prisma.customer.findFirst({
          where: { tenantId, deletedAt: null, name: { contains: args.customerName as string } },
          select: { id: true },
        });
        customerId = c?.id ?? null;
      }
      const count = await prisma.sale.count({ where: { tenantId } });
      const items = (args.items as Array<{ name: string; quantity: number; unitPrice: number }>) ?? [];
      const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const sale = await prisma.sale.create({
        data: {
          tenantId,
          saleNo: `S-${String(count + 1).padStart(5, "0")}`,
          customerId,
          totalAmount: total,
          notes: (args.notes as string) ?? null,
          items: {
            create: items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: "adet",
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
          },
        },
        select: { id: true, saleNo: true, totalAmount: true, currency: true },
      });
      return {
        result: { success: true, sale },
        clientActions: [{ type: "navigate", url: "/dashboard/sales/orders", label: "Siparişlere Git" }],
      };
    }

    default:
      return { result: { error: `Bilinmeyen araç: ${name}` } };
  }
}
