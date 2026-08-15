interface HariyoWorkerSecrets {
  AI?: Ai;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ADMIN_BOOTSTRAP_KEY?: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_ENFORCEMENT_MODE?: 'web' | 'all' | 'off';
  ESEWA_MERCHANT_CODE?: string;
  KHALTI_SECRET_KEY?: string;
  FONEPAY_MERCHANT_CODE?: string;
}

type HariyoCloudflareBindings = CloudflareEnv & HariyoWorkerSecrets;
