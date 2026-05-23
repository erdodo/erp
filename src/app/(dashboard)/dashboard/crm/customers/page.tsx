import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerTable } from "@/components/crm/CustomerTable";
import type { CrmCustomer } from "@/lib/crm-types";

export default async function CrmCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId!;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where:   { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take:    25,
      include: { _count: { select: { contacts: true, interactions: true, sales: true } } },
    }),
    prisma.customer.count({ where: { tenantId, deletedAt: null } }),
  ]);

  const pages = Math.ceil(total / 25);

  return (
    <div className="pb-8">
      <CustomerTable
        initialCustomers={customers as unknown as CrmCustomer[]}
        initialTotal={total}
        initialPages={pages}
      />
    </div>
  );
}
