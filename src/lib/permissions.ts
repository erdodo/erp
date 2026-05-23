import { prisma } from "./prisma";

export type Action = "view" | "create" | "update" | "delete" | "export";

export interface UserPermissions {
  [module: string]: Action[];
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!user) return {};
  if (user.isSuperAdmin) {
    const result: UserPermissions = {};
    const perms = await prisma.permission.findMany();
    for (const p of perms) {
      if (!result[p.module]) result[p.module] = [];
      result[p.module]!.push(p.action as Action);
    }
    return result;
  }

  const result: UserPermissions = {};
  for (const rp of user.role?.permissions ?? []) {
    const { module: mod, action } = rp.permission;
    if (!result[mod]) result[mod] = [];
    result[mod]!.push(action as Action);
  }
  return result;
}

export async function checkPermission(
  userId: string,
  mod: string,
  action: Action
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      role: { users: { some: { id: userId } } },
      permission: { module: mod, action },
    },
  });
  return !!rolePermission;
}
