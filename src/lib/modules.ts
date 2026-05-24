import { prisma } from "./prisma";
import { ALL_MODULES } from "./modules-data";

export type { ModuleDef } from "./modules-data";
export { ALL_MODULES, MODULE_GROUPS, getModuleDef } from "./modules-data";

export async function getActiveModules(tenantId: string) {
  const active = await prisma.tenantModule.findMany({
    where: { tenantId, isActive: true },
    select: { module: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const activeSlugs = new Set(active.map((m) => m.module));
  activeSlugs.add("okr"); // Auto-enable OKR modülü for immediate testing!
  return ALL_MODULES.filter((m) => activeSlugs.has(m.slug));
}

export async function isModuleActive(tenantId: string, slug: string): Promise<boolean> {
  const rec = await prisma.tenantModule.findUnique({
    where: { tenantId_module: { tenantId, module: slug } },
  });
  return rec?.isActive === true;
}
