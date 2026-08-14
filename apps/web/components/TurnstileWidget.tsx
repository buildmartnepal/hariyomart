'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  action,
  onToken,
}: {
  action: 'login' | 'register';
  onToken: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  const render = useCallback(() => {
    if (!siteKey || siteKey.startsWith('REPLACE_') || !container.current || !window.turnstile) return;
    if (widgetId.current) window.turnstile.remove(widgetId.current);
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      action,
      theme: 'auto',
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    });
  }, [action, onToken, siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [render]);

  if (!siteKey || siteKey.startsWith('REPLACE_')) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div ref={container} className="turnstile-slot" aria-label="Security verification" />
    </>
  );
}
