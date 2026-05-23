"use client";

import { useSession } from "next-auth/react";

export function usePermission() {
  const { data: session } = useSession();

  function can(mod: string, action: string): boolean {
    if (!session?.user) return false;
    if (session.user.isSuperAdmin) return true;
    const perms: string[] = session.user.permissions ?? [];
    return perms.includes("*:*") || perms.includes(`${mod}:${action}`);
  }

  function isAdmin(): boolean {
    return session?.user?.isAdmin === true || session?.user?.isSuperAdmin === true;
  }

  function isSuperAdmin(): boolean {
    return session?.user?.isSuperAdmin === true;
  }

  return { can, isAdmin, isSuperAdmin };
}
