"use client";

import { useEffect, useState } from "react";
import type { QuotaStatus } from "@/lib/quota";

export function useQuota(resource: string) {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quota/${resource}`)
      .then((r) => r.json())
      .then((data) => {
        setQuota(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [resource]);

  return {
    quota,
    loading,
    canCreate: quota?.allowed ?? true,
    remaining: quota?.remaining ?? -1,
    isUnlimited: quota?.isUnlimited ?? true,
  };
}
