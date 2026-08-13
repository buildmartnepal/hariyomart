'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { locationPresets } from '@/lib/marketplace';

export type MarketPlace = { name: string; lat: number; lng: number };

type LocationContextValue = {
  place: MarketPlace;
  radius: number;
  locating: boolean;
  message: string;
  setPlace: (place: MarketPlace) => void;
  setRadius: (radius: number) => void;
  choosePreset: (name: string) => void;
  locate: () => void;
};

const defaultPlace: MarketPlace = { ...locationPresets[0] };
const storageKey = 'hariyo-market-location-v1';
const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [place, updatePlace] = useState<MarketPlace>(defaultPlace);
  const [radius, updateRadius] = useState(150);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('Showing produce closest to Kathmandu.');
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { place?: MarketPlace; radius?: number };
      if (
        parsed.place &&
        typeof parsed.place.name === 'string' &&
        Number.isFinite(parsed.place.lat) &&
        Number.isFinite(parsed.place.lng)
      ) {
        updatePlace(parsed.place);
        setMessage(`Showing produce closest to ${parsed.place.name}.`);
      }
      if (Number.isFinite(parsed.radius)) updateRadius(Number(parsed.radius));
    } catch {
      // A corrupted preference should never block marketplace rendering.
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ place, radius }));
  }, [place, radius, preferencesReady]);

  const setPlace = useCallback((next: MarketPlace) => {
    updatePlace(next);
    setMessage(`Showing produce closest to ${next.name}.`);
  }, []);

  const setRadius = useCallback((next: number) => {
    updateRadius(next);
  }, []);

  const choosePreset = useCallback(
    (name: string) => {
      const preset = locationPresets.find((item) => item.name === name) || defaultPlace;
      setPlace({ ...preset });
    },
    [setPlace],
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage('Location is unavailable in this browser. Choose a delivery city instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePlace({
          name: 'Your location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setMessage('Marketplace ranked using your current location.');
        setLocating(false);
      },
      () => {
        setMessage('Location permission was not granted. Choose a nearby city instead.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const value = useMemo(
    () => ({ place, radius, locating, message, setPlace, setRadius, choosePreset, locate }),
    [place, radius, locating, message, setPlace, setRadius, choosePreset, locate],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useMarketLocation() {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useMarketLocation must be used within LocationProvider');
  return value;
}
