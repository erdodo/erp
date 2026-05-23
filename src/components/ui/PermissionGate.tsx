"use client";

import { usePermission } from "@/hooks/usePermission";

interface PermissionGateProps {
  module: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ module: mod, action, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermission();
  if (!can(mod, action)) return <>{fallback}</>;
  return <>{children}</>;
}
