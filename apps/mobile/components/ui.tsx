import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Link } from 'expo-router';
import { catalog } from '@/data/catalog';
import { useCart } from '@/context/CartContext';
type Product = (typeof catalog.products)[number] & { images?: readonly string[]; farmName?: string; farmerVerified?: boolean; farmSameDay?: boolean; deliveryRadiusKm?: number };
export const colors = {
  dark: '#0A3024', green: '#63D45A', accent: '#D8EF5B', bg: '#F3F8F1',
  card: '#FFFFFF', muted: '#5E746A', line: '#D8E6D9', soft: '#EAF5E5',
};
const darkColors = {
  dark: '#F1FBF5', green: '#70E3A0', accent: '#D4EF68', bg: '#06120D',
  card: '#0D2118', muted: '#A6BDB1', line: '#28453A', soft: '#132B21',
};
export function useMobileColors() {
  return useColorScheme() === 'dark' ? darkColors : colors;
}
export function Screen({ children }: { children: React.ReactNode }) {
  const palette = useMobileColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 112 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const palette = useMobileColors();
  return (
    <View style={{ marginTop: 20, marginBottom: 18 }}>
      <Text style={[s.eyebrow, { color: palette.green }]}>HARIYO MART NEPAL</Text>
      <Text style={[s.title, { color: palette.dark }]}>{title}</Text>
      {subtitle && <Text style={[s.copy, { color: palette.muted }]}>{subtitle}</Text>}
    </View>
  );
}
export function ProductCard({ p, compact = false }: { p: Product; compact?: boolean }) {
  const cart = useCart();
  const palette = useMobileColors();
  const line = cart.lines.find((item) => item.product.slug === p.slug);
  const discount =
    p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  return (
    <View
      style={[
        s.card,
        { backgroundColor: palette.card, borderColor: palette.line },
        compact && s.cardCompact,
      ]}
    >
      <Link href={`/product/${p.slug}`} asChild>
        <Pressable style={s.mobileImageShell} accessibilityLabel={`View ${p.name}`}>
          <Image
            source={{
              uri: p.image.startsWith('http')
                ? p.image
                : `${process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000'}${p.image}`,
            }}
            style={s.image}
          />
          <View style={s.mobileImageBadges}>
            {p.organic ? (
              <Text style={s.mobileOrganic}>ORGANIC</Text>
            ) : p.featured ? (
              <Text style={s.mobileFeatured}>HARIYO PICK</Text>
            ) : (
              <View />
            )}
            {discount > 0 && <Text style={s.mobileDiscount}>-{discount}%</Text>}
          </View>
          {p.images?.length ? (
            <Text style={s.mobilePhotoCount}>+{p.images.length} photos</Text>
          ) : null}
        </Pressable>
      </Link>
      <View style={s.mobileProductBadges}>
        <Text style={[s.small, { color: palette.muted }]}>
          {p.provinceName.replace(' Province', '')}
        </Text>
        <Text style={s.mobileRating}>★ {p.rating}</Text>
      </View>
      <Link href={`/product/${p.slug}`} asChild>
        <Pressable>
          <Text numberOfLines={2} style={[s.product, { color: palette.dark }]}>
            {p.name}
          </Text>
        </Pressable>
      </Link>
      <Text numberOfLines={1} style={[s.small, { color: palette.muted }]}>{p.district} · {p.farmName || 'Hariyo farmer'} · {p.unit}</Text>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
        {p.farmerVerified !== false && <Text style={{ fontSize: 9, fontWeight: '800', color: '#247447', backgroundColor: '#E9F7E5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 99 }}>✓ VERIFIED</Text>}
        {p.farmSameDay && <Text style={{ fontSize: 9, fontWeight: '800', color: '#7A4D00', backgroundColor: '#FFF2D5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 99 }}>⚡ SAME-DAY</Text>}
      </View>
      <View style={s.row}>
        <View>
          <Text style={[s.price, { color: palette.dark }]}>NPR {p.price}</Text>
          {discount > 0 && <Text style={s.mobileOldPrice}>NPR {p.oldPrice}</Text>}
        </View>
        <Pressable
          style={[s.add, line && s.addActive, p.stock <= 0 && s.addDisabled]}
          onPress={() => cart.add(p)}
          disabled={p.stock <= 0}
          accessibilityRole="button"
          accessibilityLabel={`Add ${p.name} to basket`}
        >
          <Text style={s.mobileAddText}>
            {p.stock <= 0 ? 'SOLD' : line ? `${line.quantity} IN` : '+ ADD'}
          </Text>
        </Pressable>
      </View>
      <View style={s.mobileStockRow}>
        <View
          style={[
            s.mobileStockDot,
            p.stock < 10 && { backgroundColor: '#E49D2E' },
            p.stock <= 0 && { backgroundColor: '#B24C45' },
          ]}
        />
        <Text style={[s.mobileStockText, { color: palette.muted }]}>
          {p.stock <= 0
            ? 'Restocking soon'
            : p.stock < 10
              ? `Only ${p.stock} left`
              : 'Ready to order'}
        </Text>
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
  cardCompact: { width: '48.5%', padding: 10, borderRadius: 20 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mobileImageShell: { position: 'relative', overflow: 'hidden', borderRadius: 16 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#EDF5E6' },
  mobileImageBadges: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobilePhotoCount: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(6,45,34,.78)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
  },
  mobileProductBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  mobileOrganic: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: '#247447',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 99,
  },
  mobileFeatured: {
    fontSize: 8,
    fontWeight: '900',
    color: '#173E26',
    backgroundColor: '#E6F6D9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 99,
  },
  mobileDiscount: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: '#C46D2D',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 99,
  },
  mobileRating: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '900',
    color: '#C98218',
  },
  small: { fontSize: 12, color: colors.muted, marginTop: 8 },
  product: { fontSize: 16, lineHeight: 20, fontWeight: '900', color: colors.dark, marginTop: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  price: { fontSize: 16, fontWeight: '900', color: colors.dark },
  mobileOldPrice: {
    fontSize: 10,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  add: {
    minWidth: 52,
    height: 38,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addActive: { backgroundColor: '#DDF5C6', borderWidth: 1, borderColor: colors.green },
  addDisabled: { opacity: 0.45 },
  mobileAddText: { fontSize: 10, fontWeight: '900', color: colors.dark },
  mobileStockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  mobileStockDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: '#4B9B4D' },
  mobileStockText: { fontSize: 10, fontWeight: '700', marginLeft: 3 },
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
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: { fontWeight: '900', color: colors.dark },
});
