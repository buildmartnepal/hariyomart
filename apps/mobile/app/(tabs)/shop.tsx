import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { catalog } from '@/data/catalog';
import { Header, ProductGrid, Screen, useMobileColors } from '@/components/ui';
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
  const params = useLocalSearchParams<{ category?: string }>();
  const palette = useMobileColors();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(params.category || 'all');
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
      source.filter(
        (p: any) =>
          (category === 'all' || p.category === category) &&
          `${p.name} ${p.shortDescription || ''}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [category, q, source],
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
        placeholderTextColor={palette.muted}
        style={{
          color: palette.dark,
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.line,
          padding: 15,
          borderRadius: 15,
          marginBottom: 12,
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        {[{ slug: 'all', name: 'All', emoji: '✦' }, ...catalog.categories].map((item) => {
          const selected = category === item.slug;
          return (
            <Pressable
              key={item.slug}
              onPress={() => setCategory(item.slug)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 99,
                marginRight: 8,
                backgroundColor: selected ? palette.green : palette.card,
                borderWidth: 1,
                borderColor: selected ? palette.green : palette.line,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={{ color: selected ? '#062D22' : palette.dark, fontWeight: '800' }}>
                {item.emoji} {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ProductGrid products={products as any} />
      {!products.length && !loading && (
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: palette.card }}>
          <Text style={{ fontWeight: '900', color: palette.dark }}>No matching harvests</Text>
          <Text style={{ color: palette.muted, marginTop: 5 }}>
            Try another category or search.
          </Text>
        </View>
      )}
    </Screen>
  );
}
