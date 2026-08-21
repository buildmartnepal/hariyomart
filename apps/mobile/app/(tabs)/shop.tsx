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
      typeof p.image === 'string' && (p.image.startsWith('/') || p.image.startsWith('https://'))
        ? p.image
        : `/products/${p.category}.svg`,
    images: Array.isArray(p.images) ? p.images.filter((image: unknown) => typeof image === 'string').slice(0, 8) : [],
  };
}
export default function Shop() {
  const params = useLocalSearchParams<{ category?: string }>();
  const palette = useMobileColors();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(params.category || 'all');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [stockOnly, setStockOnly] = useState(true);
  const [sort, setSort] = useState<'featured' | 'rating' | 'price'>('featured');
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
  const products = useMemo(() => {
    const filtered = source.filter(
      (p: any) =>
        (category === 'all' || p.category === category) &&
        (!organicOnly || p.organic) &&
        (!stockOnly || p.stock > 0) &&
        `${p.name} ${p.shortDescription || ''}`.toLowerCase().includes(q.toLowerCase()),
    );
    return [...filtered].sort((a: any, b: any) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'price') return a.price - b.price;
      return Number(b.featured) - Number(a.featured);
    });
  }, [category, organicOnly, q, sort, source, stockOnly]);
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
      <View
        style={{
          backgroundColor: palette.card,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          marginBottom: 18,
        }}
      >
        <Text style={{ color: palette.muted, fontSize: 11, fontWeight: '900', marginBottom: 9 }}>
          REFINE YOUR MARKET
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'featured', label: '✦ Hariyo picks' },
            { key: 'rating', label: '★ Top rated' },
            { key: 'price', label: '₨ Best price' },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSort(item.key as 'featured' | 'rating' | 'price')}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 9,
                borderRadius: 10,
                marginRight: 7,
                backgroundColor: sort === item.key ? palette.green : palette.bg,
              }}
              accessibilityState={{ selected: sort === item.key }}
            >
              <Text
                style={{ color: sort === item.key ? '#062D22' : palette.dark, fontWeight: '800' }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setOrganicOnly((current) => !current)}
            style={{
              paddingHorizontal: 11,
              paddingVertical: 9,
              borderRadius: 10,
              marginRight: 7,
              backgroundColor: organicOnly ? palette.green : palette.bg,
            }}
            accessibilityState={{ checked: organicOnly }}
          >
            <Text style={{ color: organicOnly ? '#062D22' : palette.dark, fontWeight: '800' }}>
              🌱 Organic
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStockOnly((current) => !current)}
            style={{
              paddingHorizontal: 11,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: stockOnly ? palette.green : palette.bg,
            }}
            accessibilityState={{ checked: stockOnly }}
          >
            <Text style={{ color: stockOnly ? '#062D22' : palette.dark, fontWeight: '800' }}>
              ✓ In stock
            </Text>
          </Pressable>
        </ScrollView>
      </View>
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
