import { prisma } from "@/lib/prisma";

export type NotificationType = "info" | "success" | "warning" | "error";

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  module?: string;
  recordId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: { type: "info", ...input } });
}

export async function getNotifications(userId: string, tenantId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId, tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string, tenantId: string) {
  return prisma.notification.count({ where: { userId, tenantId, isRead: false } });
}

export async function markAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string, tenantId: string) {
  return prisma.notification.updateMany({
    where: { userId, tenantId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getAllNotifications(
  userId: string,
  tenantId: string,
  opts: { page?: number; module?: string; type?: string }
) {
  const page = opts.page ?? 1;
  const take = 30;
  const skip = (page - 1) * take;
  const where = {
    userId,
    tenantId,
    ...(opts.module ? { module: opts.module } : {}),
    ...(opts.type ? { type: opts.type } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.notification.count({ where }),
  ]);
  return { items, total, page, pages: Math.ceil(total / take) };
}
