import { getCloudflareContext } from '@opennextjs/cloudflare';

type RuntimeEnv = Record<string, unknown>;

function readRuntimeEnv(): RuntimeEnv {
  try {
    return getCloudflareContext().env as unknown as RuntimeEnv;
  } catch {
    return process.env as unknown as RuntimeEnv;
  }
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function getPublicRuntimeConfig() {
  const env = readRuntimeEnv();
  const appEnv = text(env.APP_ENV, process.env.NODE_ENV || 'development');
  const requestedDemo = text(env.NEXT_PUBLIC_DEMO_MODE, process.env.NEXT_PUBLIC_DEMO_MODE) === 'true';
  const productionTestMode = text(env.PRODUCTION_TEST_MODE, process.env.PRODUCTION_TEST_MODE) === 'true';
  const siteKey = text(
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
  const turnstileMode = text(env.TURNSTILE_ENFORCEMENT_MODE, 'web');
  const siteUrl = text(
    env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''),
  ).replace(/\/$/, '');
  const configuredApi = text(env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_API_URL || '/api');
  const apiBase = configuredApi.startsWith('http')
    ? configuredApi.replace(/\/$/, '')
    : siteUrl
      ? `${siteUrl}${configuredApi.startsWith('/') ? configuredApi : `/${configuredApi}`}`.replace(/\/$/, '')
      : configuredApi;
  const validSiteKey = Boolean(siteKey && !siteKey.startsWith('REPLACE_'));

  return {
    appEnv,
    releaseVersion: text(env.RELEASE_VERSION, '8.9.0'),
    siteUrl,
    apiBase,
    productionTestMode: appEnv === 'production' && productionTestMode,
    demoEnabled: requestedDemo && (appEnv !== 'production' || productionTestMode),
    turnstileSiteKey: validSiteKey ? siteKey : '',
    turnstileEnabled: turnstileMode !== 'off' && validSiteKey,
  } as const;
}
