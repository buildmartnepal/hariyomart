'use client';
import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  UserRound,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { TurnstileWidget } from './TurnstileWidget';
import { usePublicConfig } from './PublicConfigProvider';

type DemoAccount = { email: string; label: string; workspace: string };
type DemoConfig = { password: string; accounts: DemoAccount[] };

export function AuthPanel({ mode }: { mode: 'login' | 'register' }) {
  const auth = useAuth();
  const { demoEnabled, turnstileEnabled } = usePublicConfig();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [challengeNonce, setChallengeNonce] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoConfig, setDemoConfig] = useState<DemoConfig | null>(null);

  useEffect(() => {
    if (!demoEnabled || mode !== 'login') {
      setDemoConfig(null);
      return;
    }
    const controller = new AbortController();
    fetch('/api/demo-config', { cache: 'no-store', signal: controller.signal })
      .then((response) =>
        response.ok ? (response.json() as Promise<DemoConfig>) : Promise.reject(new Error('Demo configuration unavailable')),
      )
      .then((config) => setDemoConfig(config))
      .catch(() => setDemoConfig(null));
    return () => controller.abort();
  }, [demoEnabled, mode]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const fd = new FormData(e.currentTarget);
    try {
      const user =
        mode === 'login'
          ? await auth.login(email, password, turnstileToken || undefined)
          : await auth.registerBuyer({
              name: String(fd.get('name')),
              email,
              password,
              phone: String(fd.get('phone') || ''),
              turnstileToken: turnstileToken || undefined,
            });
      router.push(
        user.role === 'admin'
          ? '/admin/overview'
          : ['farmer', 'vendor'].includes(user.role)
            ? '/farmer/overview'
            : '/account/overview',
      );
      router.refresh();
    } catch (err) {
      setTurnstileToken('');
      setChallengeNonce((value) => value + 1);
      setMessage(err instanceof Error ? err.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  function loadDemo(emailValue: string) {
    if (!demoConfig) return;
    setEmail(emailValue);
    setPassword(demoConfig.password);
    setMessage('Demo credentials loaded. Complete the security challenge if it is enabled, then sign in.');
  }

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Image
          className="auth-premium-mark"
          src="/campaigns/premium-logo.webp"
          alt="Hariyo Mart Nepal Premium"
          width={1600}
          height={854}
          sizes="(max-width: 950px) 280px, 420px"
        />
        <span className="eyebrow">One identity across Hariyo</span>
        <h1>
          {mode === 'login'
            ? 'Welcome back to your local food network.'
            : 'Create your buyer account.'}
        </h1>
        <p>
          Buy from nearby farms, track deliveries and manage repeat baskets. Farmer accounts use the
          dedicated seller onboarding so every farm receives its own tenant workspace.
        </p>
        {mode === 'login' && (
          <div className="admin-owner-hint">
            <ShieldCheck size={16} />
            <span>
              <b>Production owner access</b> is created securely during deployment and remains separate
              from optional demo identities.
            </span>
          </div>
        )}
        <div className="auth-benefits">
          <div>
            <MapPin />
            <span>
              <b>Location matching</b>See harvests serviceable to your address.
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>Secure account layer</b>Role-aware buyer, farmer and admin workspaces.
            </span>
          </div>
          <div>
            <BadgeCheck />
            <span>
              <b>Traceable sellers</b>Verification status travels with every listing.
            </span>
          </div>
        </div>
        <Link className="auth-farmer-link" href="/sell">
          <Store /> I am a farmer or cooperative <span>Open seller onboarding →</span>
        </Link>
      </section>

      <form className="auth-card" onSubmit={submit} aria-busy={busy}>
        <div className="auth-icon">{mode === 'login' ? <LockKeyhole /> : <UserRound />}</div>
        <h2>{mode === 'login' ? 'Sign in' : 'Join Hariyo Mart'}</h2>
        <p>
          {mode === 'login'
            ? 'Use your buyer, farmer, team or admin account.'
            : 'Create a buyer account in less than a minute.'}
        </p>
        {mode === 'register' && (
          <label>
            Full name
            <input name="name" required placeholder="Your name" />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {mode === 'register' && (
          <label>
            Mobile number
            <input name="phone" inputMode="tel" placeholder="98XXXXXXXX" />
          </label>
        )}
        <label>
          Password
          <input
            name="password"
            required
            type="password"
            minLength={mode === 'register' ? 10 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'register' ? '10+ chars with upper, lower & number' : 'Your password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === 'register' && (
          <div className="password-hint">Use 10+ characters with uppercase, lowercase and a number.</div>
        )}

        {mode === 'login' && demoEnabled && demoConfig && (
          <section className="demo-login-panel" aria-label="Demo accounts">
            <div className="demo-login-heading">
              <span><Sparkles size={16} /> Demo workspaces</span>
              <small><KeyRound size={13} /> Shared password: <code>{demoConfig.password}</code></small>
            </div>
            <div className="demo-login-grid">
              {demoConfig.accounts.map((account) => (
                <button
                  type="button"
                  key={account.email}
                  onClick={() => loadDemo(account.email)}
                  title={`${account.workspace} — ${account.email}`}
                >
                  <b>{account.label}</b>
                  <span>{account.workspace}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <TurnstileWidget
          key={`${mode}-${challengeNonce}`}
          action={mode === 'login' ? 'login' : 'register'}
          onToken={setTurnstileToken}
        />
        {message && <div className="auth-error" role="alert" aria-live="polite">{message}</div>}
        <button
          className="btn btn-primary btn-full"
          disabled={busy || (turnstileEnabled && !turnstileToken)}
          type="submit"
        >
          <Sprout size={17} />
          {busy ? 'Connecting…' : mode === 'login' ? 'Sign in securely' : 'Create buyer account'}
        </button>
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              New to Hariyo? <Link href="/register">Create buyer account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
