import { requireSuperAdmin } from "@/lib/superadmin-guard";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <>{children}</>;
}
