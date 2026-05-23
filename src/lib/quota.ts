import { prisma } from "./prisma";

export interface QuotaStatus {
  allowed: boolean;
  current: number;
  max: number;
  remaining: number;
  isUnlimited: boolean;
}

export async function checkQuota(tenantId: string, resource: string): Promise<QuotaStatus> {
  const quota = await prisma.tenantQuota.findUnique({
    where: { tenantId_resource: { tenantId, resource } },
  });

  if (!quota) {
    return { allowed: true, current: 0, max: -1, remaining: -1, isUnlimited: true };
  }

  if (quota.isUnlimited) {
    return { allowed: true, current: quota.currentCount, max: -1, remaining: -1, isUnlimited: true };
  }

  const remaining = quota.maxCount - quota.currentCount;
  return {
    allowed: remaining > 0,
    current: quota.currentCount,
    max: quota.maxCount,
    remaining,
    isUnlimited: false,
  };
}

export async function incrementQuota(tenantId: string, resource: string): Promise<void> {
  await prisma.tenantQuota.updateMany({
    where: { tenantId, resource },
    data: { currentCount: { increment: 1 } },
  });
}

export async function decrementQuota(tenantId: string, resource: string): Promise<void> {
  await prisma.tenantQuota.updateMany({
    where: { tenantId, resource, currentCount: { gt: 0 } },
    data: { currentCount: { decrement: 1 } },
  });
}

export async function getAllQuotas(tenantId: string) {
  return prisma.tenantQuota.findMany({ where: { tenantId } });
}
