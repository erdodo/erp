"use client";

import { useEffect, useState } from "react";
import type { ModuleDef } from "@/lib/modules-data";

export function useActiveModules() {
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/modules/active")
      .then((r) => r.json())
      .then((data) => {
        setModules(data.modules ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { modules, loading };
}

export function useIsModuleActive(slug: string): boolean {
  const { modules } = useActiveModules();
  return modules.some((m) => m.slug === slug);
}
