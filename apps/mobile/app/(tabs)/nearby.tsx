import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen, Header, ProductCard, colors, s } from '@/components/ui';
import { nearProducts } from '@/lib/nearby';
import { catalog } from '@/data/catalog';
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
function normalize(p: any) {
  const province = catalog.provinces.find((x) => x.slug === p.province);
  return {
    ...p,
    provinceName: province?.name || p.province,
    emoji: p.emoji || '🌱',
    oldPrice: p.oldPrice || p.price,
    rating: p.rating || 4.8,
    featured: false,
    shortDescription: p.shortDescription || `Fresh ${p.name} from a Hariyo farmer.`,
    description: p.description || p.shortDescription || `Traceable ${p.name} from ${p.district}.`,
    benefits: p.benefits || [
      'Traceable farm origin',
      'Location-matched delivery',
      'Live seller stock',
    ],
    image: typeof p.image === 'string' ? p.image : `/products/${p.category}.svg`,
    images: Array.isArray(p.images) ? p.images.filter((image: unknown) => typeof image === 'string').slice(0, 8) : [],
  };
}
export default function Nearby() {
  const [coords, setCoords] = useState({ lat: 27.7172, lng: 85.324 });
  const [radius, setRadius] = useState(75);
  const [status, setStatus] = useState('Kathmandu selected');
  const [live, setLive] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fallback = useMemo(() => nearProducts(coords.lat, coords.lng, radius), [coords, radius]);
  const items = live ?? fallback;
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(
      `${api}/marketplace/nearby?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radius}&category=all&limit=40`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => {
        if (active) setLive(Array.isArray(d.data) ? d.data.map(normalize) : null);
      })
      .catch(() => {
        if (active) setLive(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [coords, radius]);
  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatus('Location permission denied');
      return;
    }
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
    setStatus('Using your current location');
  }
  return (
    <Screen>
      <Header
        title="Fresh near you"
        subtitle="Hariyo Match v3 ranks delivery fit, freshness, live stock and seller trust."
      />
      <View
        style={{ backgroundColor: colors.dark, borderRadius: 22, padding: 20, marginBottom: 16 }}
      >
        <Text style={{ color: '#BDD0C8', fontSize: 12, fontWeight: '800' }}>
          LIVE LOCATION MATCHING
        </Text>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', marginTop: 6 }}>
          {loading ? 'Finding harvests…' : `${items.length} products within ${radius} km`}
        </Text>
        <Text style={{ color: '#AFC3BA', marginTop: 7 }}>
          {status} · {live ? 'Live seller inventory' : 'Seed preview'}
        </Text>
        <Pressable style={s.button} onPress={locate}>
          <Text style={s.buttonText}>◎ Use my location</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[35, 75, 150].map((x) => (
            <Pressable
              key={x}
              onPress={() => setRadius(x)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 99,
                backgroundColor: radius === x ? colors.green : '#17483A',
              }}
            >
              <Text style={{ fontWeight: '900', color: radius === x ? colors.dark : 'white' }}>
                {x} km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {items.slice(0, 14).map((p: any) => (
        <View key={p.slug}>
          <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 3, marginBottom: 4 }}>
            {p.matchScore ? `${p.matchScore}% match · ` : ''}{p.farmName || 'Verified farmer'} · {Number(p.distanceKm || 0).toFixed(1)} km
          </Text>
          <ProductCard p={p as any} />
        </View>
      ))}
      {!items.length && !loading && (
        <View
          style={{
            backgroundColor: 'white',
            padding: 22,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ fontWeight: '900', fontSize: 18, color: colors.dark }}>
            No serviceable harvests yet
          </Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            Increase the radius. Sellers only appear when your delivery location is inside their
            configured service area.
          </Text>
        </View>
      )}
    </Screen>
  );
}
