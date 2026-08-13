import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, Image, Pressable } from 'react-native';
import { catalog } from '@/data/catalog';
import { Screen, s, colors } from '@/components/ui';
import { useCart } from '@/context/CartContext';
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const web = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';
function normalize(p: any) {
  const province = catalog.provinces.find((x) => x.slug === p.province);
  return {
    ...p,
    provinceName: p.provinceName || province?.name || p.province,
    emoji: p.emoji || '🌱',
    oldPrice: p.oldPrice || p.price,
    rating: p.rating || 4.8,
    featured: false,
    shortDescription: p.shortDescription || `Fresh ${p.name} from a Hariyo farmer.`,
    description: p.description || p.uniqueStory || `Traceable ${p.name} from ${p.district}.`,
    benefits: p.benefits || [
      'Traceable farm origin',
      'Live seller stock',
      'Location-aware delivery',
    ],
    image:
      typeof p.image === 'string' && p.image.startsWith('/')
        ? p.image
        : `/products/${p.category}.svg`,
  };
}
export default function Product() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const seed = catalog.products.find((x) => x.slug === slug);
  const [p, setP] = useState<any>(seed || null);
  const [loading, setLoading] = useState(!seed);
  const c = useCart();
  useEffect(() => {
    if (seed || !slug) return;
    let active = true;
    fetch(`${api}/products/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => {
        if (active) setP(normalize(d));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, seed]);
  if (loading)
    return (
      <Screen>
        <Text style={{ color: colors.muted }}>Loading live farmer product…</Text>
      </Screen>
    );
  if (!p)
    return (
      <Screen>
        <Text>Product not found.</Text>
      </Screen>
    );
  return (
    <Screen>
      <Image
        source={{ uri: p.image.startsWith('/') ? `${web}${p.image}` : p.image }}
        style={{ width: '100%', height: 290, borderRadius: 24, backgroundColor: '#EDF5E6' }}
      />
      <Text style={{ color: '#5C9E25', fontWeight: '900', marginTop: 18 }}>
        {p.farmName ? `${p.farmName} · ` : ''}
        {p.provinceName}
      </Text>
      <Text style={s.title}>{p.name}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.dark, marginTop: 12 }}>
        NPR {p.price}
      </Text>
      <Text style={s.copy}>{p.shortDescription}</Text>
      {p.harvestWindow && (
        <Text style={{ marginTop: 10, color: '#5C9E25', fontWeight: '800' }}>
          {p.harvestWindow}
        </Text>
      )}
      <Pressable style={s.button} onPress={() => c.add(p)}>
        <Text style={s.buttonText}>Add to basket</Text>
      </Pressable>
      {p.benefits.map((b: string) => (
        <Text key={b} style={{ marginTop: 14, color: colors.muted }}>
          ✓ {b}
        </Text>
      ))}
    </Screen>
  );
}
