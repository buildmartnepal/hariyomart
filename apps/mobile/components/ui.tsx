import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Link } from 'expo-router';
import { catalog } from '@/data/catalog';
import { useCart } from '@/context/CartContext';
type Product = (typeof catalog.products)[number];
export const colors = {
  dark: '#062D22',
  green: '#88D92F',
  bg: '#F6F9F1',
  card: '#FFFFFF',
  muted: '#65776F',
  line: '#DDE7D8',
};
const darkColors = {
  dark: '#F1FBF5',
  green: '#9BEA4D',
  bg: '#07130F',
  card: '#10241C',
  muted: '#A8BBB1',
  line: '#29473B',
};
export function useMobileColors() {
  return useColorScheme() === 'dark' ? darkColors : colors;
}
export function Screen({ children }: { children: React.ReactNode }) {
  const palette = useMobileColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
    >
      {children}
    </ScrollView>
  );
}
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const palette = useMobileColors();
  return (
    <View style={{ marginTop: 20, marginBottom: 18 }}>
      <Text style={s.eyebrow}>HARIYO MART NEPAL</Text>
      <Text style={[s.title, { color: palette.dark }]}>{title}</Text>
      {subtitle && <Text style={[s.copy, { color: palette.muted }]}>{subtitle}</Text>}
    </View>
  );
}
export function ProductCard({ p, compact = false }: { p: Product; compact?: boolean }) {
  const cart = useCart();
  const palette = useMobileColors();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: palette.card, borderColor: palette.line },
        compact && s.cardCompact,
      ]}
    >
      <Image
        source={{ uri: `${process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000'}${p.image}` }}
        style={s.image}
      />
      <View style={s.mobileProductBadges}>
        <Text style={[s.small, { color: palette.muted }]}>
          {p.provinceName.replace(' Province', '')} · ★ {p.rating}
        </Text>
        {p.organic && <Text style={s.mobileOrganic}>Organic</Text>}
      </View>
      <Link href={`/product/${p.slug}`} asChild>
        <Pressable>
          <Text numberOfLines={2} style={[s.product, { color: palette.dark }]}>
            {p.name}
          </Text>
        </Pressable>
      </Link>
      <Text style={[s.small, { color: palette.muted }]}>{p.unit}</Text>
      <View style={s.row}>
        <Text style={[s.price, { color: palette.dark }]}>NPR {p.price}</Text>
        <Pressable style={s.add} onPress={() => cart.add(p)}>
          <Text style={{ fontSize: 20, fontWeight: '900' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <View style={s.productGrid}>
      {products.map((product) => (
        <ProductCard compact p={product} key={product.slug} />
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: '#5F9F26' },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '900', color: colors.dark, marginTop: 8 },
  copy: { fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 13,
    marginBottom: 14,
  },
  cardCompact: { width: '48.5%', padding: 10, borderRadius: 17 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: '#EDF5E6' },
  mobileProductBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  mobileOrganic: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: '900',
    color: '#247447',
    backgroundColor: '#E8F6E9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
  },
  small: { fontSize: 12, color: colors.muted, marginTop: 8 },
  product: { fontSize: 17, fontWeight: '800', color: colors.dark, marginTop: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  price: { fontSize: 17, fontWeight: '900', color: colors.dark },
  add: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#EAF5DF',
    marginRight: 8,
  },
  hero: {
    minHeight: 390,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    backgroundColor: 'rgba(2, 31, 23, 0.55)',
  },
  heroTitle: { fontSize: 38, lineHeight: 40, fontWeight: '900', color: 'white' },
  heroGreen: { color: colors.green },
  button: {
    backgroundColor: colors.green,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: { fontWeight: '900', color: colors.dark },
});
