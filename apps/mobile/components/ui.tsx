import React from 'react';
import { Pressable, StyleSheet, Text, View, Image, ScrollView } from 'react-native';
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
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
    >
      {children}
    </ScrollView>
  );
}
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: 20, marginBottom: 18 }}>
      <Text style={s.eyebrow}>HARIYO MART NEPAL</Text>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.copy}>{subtitle}</Text>}
    </View>
  );
}
export function ProductCard({ p }: { p: Product }) {
  const cart = useCart();
  return (
    <View style={s.card}>
      <Image
        source={{ uri: `${process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000'}${p.image}` }}
        style={s.image}
      />
      <Text style={s.small}>
        {p.provinceName.replace(' Province', '')} · ★ {p.rating}
      </Text>
      <Link href={`/product/${p.slug}`} asChild>
        <Pressable>
          <Text style={s.product}>{p.name}</Text>
        </Pressable>
      </Link>
      <Text style={s.small}>{p.unit}</Text>
      <View style={s.row}>
        <Text style={s.price}>NPR {p.price}</Text>
        <Pressable style={s.add} onPress={() => cart.add(p)}>
          <Text style={{ fontSize: 20, fontWeight: '900' }}>+</Text>
        </Pressable>
      </View>
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
  image: { width: '100%', height: 150, borderRadius: 14, backgroundColor: '#EDF5E6' },
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
  hero: { backgroundColor: colors.dark, borderRadius: 24, padding: 24, marginBottom: 20 },
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
