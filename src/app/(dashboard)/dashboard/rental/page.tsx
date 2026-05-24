"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RentalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/properties");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <i className="pi pi-spin pi-spinner text-3xl animate-spin" style={{ color: "var(--color-primary)" }} />
    </div>
  );
}
