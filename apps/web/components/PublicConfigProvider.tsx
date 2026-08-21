'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type PublicRuntimeConfig = {
  appEnv: string;
  releaseVersion: string;
  siteUrl: string;
  apiBase: string;
  demoEnabled: boolean;
  productionTestMode: boolean;
  turnstileSiteKey: string;
  turnstileEnabled: boolean;
};

const fallbackConfig: PublicRuntimeConfig = {
  appEnv: 'production',
  releaseVersion: '8.9.1',
  siteUrl: '',
  apiBase: '/api',
  demoEnabled: false,
  productionTestMode: false,
  turnstileSiteKey: '',
  turnstileEnabled: false,
};

const PublicConfigContext = createContext<PublicRuntimeConfig>(fallbackConfig);

export function PublicConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicRuntimeConfig>(fallbackConfig);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public-config', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Partial<PublicRuntimeConfig>>) : Promise.reject(new Error('config unavailable'))))
      .then((next) => setConfig({ ...fallbackConfig, ...next }))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const value = useMemo(() => config, [config]);
  return <PublicConfigContext.Provider value={value}>{children}</PublicConfigContext.Provider>;
}

export function usePublicConfig() {
  return useContext(PublicConfigContext);
}
