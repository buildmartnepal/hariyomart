import { Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { catalog } from '@/data/catalog';
import { Screen, Header, ProductCard, colors } from '@/components/ui';
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
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
export default function Shop() {
  const [q, setQ] = useState('');
  const [live, setLive] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`${api}/products?limit=100`)
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
  }, []);
  const source = live ?? catalog.products;
  const products = useMemo(
    () =>
      source.filter((p: any) =>
        `${p.name} ${p.shortDescription || ''}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, source],
  );
  return (
    <Screen>
      <Header
        title="Shop Nepal"
        subtitle={
          loading
            ? 'Refreshing farmer inventory…'
            : `${products.length} products · ${live ? 'live marketplace' : 'seed preview'}`
        }
      />
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search tea, apple, honey..."
        style={{
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: colors.line,
          padding: 15,
          borderRadius: 15,
          marginBottom: 16,
        }}
      />
      {products.map((p: any) => (
        <ProductCard p={p as any} key={p.slug} />
      ))}
      {!products.length && !loading && (
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: 'white' }}>
          <Text style={{ fontWeight: '900', color: colors.dark }}>No matching harvests</Text>
        </View>
      )}
    </Screen>
  );
}
