'use client';
import { FormEvent, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  Crosshair,
  MapPin,
  PackagePlus,
  Smartphone,
  Store,
  WalletCards,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useAuth } from './AuthProvider';
import { TurnstileWidget } from './TurnstileWidget';
export function SellOnHariyo() {
  const auth = useAuth();
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [challengeNonce, setChallengeNonce] = useState(0);
  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setMessage('Farm coordinates attached for location matching.');
      },
      () =>
        setMessage(
          'Location permission was not granted. You can continue with your written farm address.',
        ),
      { maximumAge: 300000, timeout: 8000 },
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(form.entries()), ...coords, turnstileToken: turnstileToken || undefined };
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      const r = await fetch(`${api}/auth/register-farmer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error || 'Registration failed');
      await auth.refreshMe();
      setSent(true);
      setMessage('Your farmer workspace is created and pending verification.');
    } catch (err) {
      setTurnstileToken('');
      setChallengeNonce((value) => value + 1);
      setMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="seller-layout">
      <div className="seller-promise">
        <span className="eyebrow">Farmer-first commerce</span>
        <h2>Your farm becomes its own digital shop.</h2>
        <p>
          Hariyo Mart is designed as a multi-tenant marketplace: every verified farmer, cooperative
          or producer gets an independent seller workspace while buyers see one simple marketplace.
        </p>
        <div className="seller-features">
          <div>
            <MapPin />
            <span>
              <b>Sell from your exact location</b>Set farm, pickup and delivery radius.
            </span>
          </div>
          <div>
            <PackagePlus />
            <span>
              <b>Post unique crops in minutes</b>Quantity, harvest date, grade and price.
            </span>
          </div>
          <div>
            <WalletCards />
            <span>
              <b>Separate orders and payouts</b>Seller-level settlement and commissions.
            </span>
          </div>
          <div>
            <Camera />
            <span>
              <b>Photo-first listings</b>Show the actual crop, farm and batch.
            </span>
          </div>
          <div>
            <Smartphone />
            <span>
              <b>Works on mobile</b>Farmer mode in the companion app.
            </span>
          </div>
          <div>
            <BadgeCheck />
            <span>
              <b>Verification builds trust</b>KYC, farm review and traceable origin.
            </span>
          </div>
        </div>
      </div>
      <form className="seller-form" onSubmit={submit}>
        <div className="form-heading">
          <Store />
          <div>
            <b>Open your Hariyo Store</b>
            <span>Create farmer account + tenant workspace</span>
          </div>
        </div>
        {sent ? (
          <div className="success-box">
            <CheckCircle2 size={42} />
            <h3>Your farmer workspace is ready</h3>
            <p>{message}</p>
            <a className="btn btn-primary" href="/farmer/list-harvest">
              List your first harvest
            </a>
          </div>
        ) : (
          <>
            <label>
              Farm / producer name
              <input name="farmName" required placeholder="e.g. Kapan Rooftop Greens" />
            </label>
            <label>
              Your name
              <input name="ownerName" required placeholder="Farmer or cooperative contact" />
            </label>
            <div className="form-2">
              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                />
              </label>
            </div>
            <div className="form-2">
              <label>
                Mobile number
                <input name="phone" required inputMode="tel" placeholder="98XXXXXXXX" />
              </label>
              <label>
                Province
                <select name="province" required defaultValue="bagmati">
                  {catalog.provinces.map((p) => (
                    <option value={p.slug} key={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-2">
              <label>
                District
                <input name="district" required placeholder="Kathmandu" />
              </label>
              <label>
                Municipality
                <input
                  name="municipality"
                  required
                  placeholder="Municipality / rural municipality"
                />
              </label>
            </div>
            <div className="form-2">
              <label>
                Ward
                <input name="ward" required placeholder="Ward no." />
              </label>
              <label>
                Farm coordinates
                <button className="inline-locate" type="button" onClick={locate}>
                  <Crosshair size={15} />
                  {coords.lat ? 'Location attached' : 'Use farm location'}
                </button>
              </label>
            </div>
            <label>
              What do you grow?
              <textarea
                name="specialties"
                required
                rows={4}
                placeholder="Akabare chilli, leafy greens, honey, coffee…"
              />
            </label>
            <label className="checkline">
              <input type="checkbox" required />
              <span>
                I agree to provide truthful farm, origin and product information for verification.
              </span>
            </label>
            <TurnstileWidget key={`farmer-${challengeNonce}`} action="register" onToken={setTurnstileToken} />
            {message && <div className="form-message">{message}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
              <Building2 size={18} />
              {busy ? 'Creating workspace…' : 'Create farmer account + store'}
            </button>
            <small>
              Farmer stores begin in pending-verification status. Products can be prepared
              immediately and activated after marketplace review.
            </small>
          </>
        )}
      </form>
    </div>
  );
}
