'use client';
import Link from 'next/link';
import { Crosshair, MapPin, Navigation, Truck } from 'lucide-react';
import { distanceKm } from '@/lib/marketplace';
import { useMarketLocation } from './LocationProvider';

export function ProductLocationFit({
  productName,
  sellerName,
  sellerLat,
  sellerLng,
  deliveryRadiusKm,
  sameDay,
}: {
  productName: string;
  sellerName: string;
  sellerLat: number;
  sellerLng: number;
  deliveryRadiusKm: number;
  sameDay: boolean;
}) {
  const market = useMarketLocation();
  const distance = distanceKm(market.place.lat, market.place.lng, sellerLat, sellerLng);
  const serviceable = distance <= deliveryRadiusKm;
  const local = serviceable && distance <= Math.min(20, deliveryRadiusKm);
  const distanceLabel = Number.isFinite(distance) ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : 'distance unavailable';
  return (
    <section className={`product-location-fit${serviceable ? ' is-serviceable' : ' is-outside'}`} aria-label={`Delivery fit for ${productName}`}>
      <div className="product-location-fit-icon"><Navigation size={18} /></div>
      <div className="product-location-fit-copy">
        <span>{local ? 'Excellent local match' : serviceable ? 'Delivery zone match' : 'Outside this seller’s delivery zone'}</span>
        <b>{distanceLabel} from {market.place.name}</b>
        <small>
          {serviceable
            ? `${sellerName} serves this location${sameDay && local ? ' · same-day may be available' : ''}.`
            : `Seller radius is ${deliveryRadiusKm} km. Try another address or browse nearer farms.`}
        </small>
      </div>
      <button type="button" className="product-location-fit-action" onClick={market.locate} disabled={market.locating}>
        <Crosshair size={15} /> {market.locating ? 'Locating…' : 'Use my location'}
      </button>
      <Link href="/nearby" className="product-location-fit-nearby"><MapPin size={14}/> Nearby alternatives</Link>
      {serviceable ? <Truck className="product-location-fit-truck" size={18}/> : null}
    </section>
  );
}
