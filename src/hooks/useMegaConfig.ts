import { useEffect, useState } from "react";

import { getUserMegaConfig, type UserMegaConfigInfo } from "@/lib/api/api-mega-config";

interface UseMegaConfigReturn {
  megaConfig: UserMegaConfigInfo | null;
  loading: boolean;
  error: string | undefined;
  setMegaConfig: (config: UserMegaConfigInfo | null) => void;
  setLoading: (loading: boolean) => void;
  refetch: () => Promise<void>;
}

export function useMegaConfig(isOpen: boolean): UseMegaConfigReturn {
  const [megaConfig, setMegaConfig] = useState<UserMegaConfigInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const res = await getUserMegaConfig();

      if (res.hasConfig && res.config) {
        setMegaConfig(res.config);
      } else {
        setMegaConfig(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la config MEGA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchConfig();
  }, [isOpen]);

  return {
    megaConfig,
    loading,
    error,
    setMegaConfig,
    setLoading,
    refetch: fetchConfig,
  };
}
