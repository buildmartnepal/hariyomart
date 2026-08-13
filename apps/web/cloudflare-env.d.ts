interface HariyoWorkerSecrets {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ADMIN_BOOTSTRAP_KEY?: string;
}

type HariyoCloudflareBindings = CloudflareEnv & HariyoWorkerSecrets;
