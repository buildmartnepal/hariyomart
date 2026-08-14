import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { catalog } from '@/data/catalog';
import { Screen, s, useMobileColors } from '@/components/ui';
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
  const [quantity, setQuantity] = useState(1);
  const palette = useMobileColors();
  const cart = useCart();

  useEffect(() => {
    if (seed || !slug) return;
    let active = true;
    fetch(`${api}/products/${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((data) => {
        if (active) setP(normalize(data));
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
        <View style={{ padding: 24, borderRadius: 20, backgroundColor: palette.card }}>
          <Text style={{ color: palette.muted, fontWeight: '800' }}>
            Loading live farmer product…
          </Text>
        </View>
      </Screen>
    );

  if (!p)
    return (
      <Screen>
        <View style={{ padding: 24, borderRadius: 20, backgroundColor: palette.card }}>
          <Text style={{ color: palette.dark, fontWeight: '900' }}>Product not found</Text>
          <Text style={{ color: palette.muted, marginTop: 6 }}>
            This listing may be paused or outside the current marketplace.
          </Text>
        </View>
      </Screen>
    );

  const discount =
    p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const line = cart.lines.find((item) => item.product.slug === p.slug);
  const category = catalog.categories.find((item) => item.slug === p.category);

  return (
    <Screen>
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: p.image.startsWith('/') ? `${web}${p.image}` : p.image }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 26, backgroundColor: '#EDF5E6' }}
        />
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              backgroundColor: '#247447',
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 99,
              fontSize: 10,
              fontWeight: '900',
            }}
          >
            {p.organic ? '🌱 ORGANIC' : '✓ QUALITY CHECKED'}
          </Text>
          {discount > 0 && (
            <Text
              style={{
                color: '#FFFFFF',
                backgroundColor: '#B9652A',
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 99,
                fontSize: 10,
                fontWeight: '900',
              }}
            >
              SAVE {discount}%
            </Text>
          )}
        </View>
      </View>

      <Text style={{ color: '#5C9E25', fontWeight: '900', marginTop: 20, letterSpacing: 0.5 }}>
        {category?.emoji || p.emoji} {category?.name || p.category} · {p.provinceName}
      </Text>
      <Text style={[s.title, { color: palette.dark, fontSize: 36, lineHeight: 40 }]}>{p.name}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ color: '#C98218', fontWeight: '900', marginRight: 14 }}>
          ★ {p.rating} / 5
        </Text>
        <Text style={{ color: palette.muted, fontWeight: '700' }}>📍 {p.district}</Text>
      </View>

      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 18 }}
      >
        <Text style={{ fontSize: 26, fontWeight: '900', color: palette.dark }}>NPR {p.price}</Text>
        <Text style={{ color: palette.muted, marginLeft: 6 }}>/ {p.unit}</Text>
        {discount > 0 && (
          <Text
            style={{
              color: palette.muted,
              marginLeft: 12,
              textDecorationLine: 'line-through',
            }}
          >
            NPR {p.oldPrice}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            backgroundColor: p.stock < 10 ? '#E49D2E' : '#4B9B4D',
            marginRight: 7,
          }}
        />
        <Text style={{ color: palette.muted, fontWeight: '800' }}>
          {p.stock > 0 ? `${p.stock} available from seller stock` : 'Restocking soon'}
        </Text>
      </View>

      <Text style={[s.copy, { color: palette.muted, fontSize: 16, lineHeight: 25 }]}>
        {p.shortDescription}
      </Text>
      {p.harvestWindow && (
        <Text style={{ marginTop: 10, color: '#5C9E25', fontWeight: '800' }}>
          🕒 {p.harvestWindow}
        </Text>
      )}

      <View
        style={{
          backgroundColor: palette.card,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 22,
          padding: 16,
          marginTop: 22,
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text style={{ color: palette.dark, fontWeight: '900' }}>Choose quantity</Text>
            <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
              {p.unit} per unit
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.bg,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Decrease quantity"
            >
              <Text style={{ color: palette.dark, fontSize: 20, fontWeight: '900' }}>−</Text>
            </Pressable>
            <Text
              style={{ color: palette.dark, fontWeight: '900', minWidth: 26, textAlign: 'center' }}
            >
              {quantity}
            </Text>
            <Pressable
              onPress={() => setQuantity((current) => Math.min(p.stock, current + 1))}
              disabled={quantity >= p.stock}
              style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Increase quantity"
            >
              <Text style={{ color: palette.dark, fontSize: 20, fontWeight: '900' }}>+</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          style={[s.button, { opacity: p.stock <= 0 ? 0.45 : 1 }]}
          onPress={() => cart.add(p, quantity)}
          disabled={p.stock <= 0}
          accessibilityRole="button"
        >
          <Text style={s.buttonText}>
            {p.stock > 0 ? `Add to basket · NPR ${p.price * quantity}` : 'Currently sold out'}
          </Text>
        </Pressable>
        <Text style={{ color: palette.muted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          {line ? `${line.quantity} already in your basket` : 'No payment taken yet'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
        {[
          ['🌱', 'Farm origin'],
          ['🚚', 'Delivery or pickup'],
          ['🛡️', 'Order support'],
        ].map(([icon, label]) => (
          <View
            key={label}
            style={{
              width: '31.5%',
              minHeight: 90,
              backgroundColor: palette.card,
              borderColor: palette.line,
              borderWidth: 1,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 9,
            }}
          >
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text
              style={{
                color: palette.dark,
                fontSize: 10,
                fontWeight: '900',
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 22,
          padding: 18,
          marginTop: 18,
        }}
      >
        <Text style={{ color: '#5C9E25', fontSize: 10, letterSpacing: 1.5, fontWeight: '900' }}>
          WHY THIS PRODUCT
        </Text>
        {p.benefits.map((benefit: string) => (
          <Text key={benefit} style={{ marginTop: 14, color: palette.dark, fontWeight: '700' }}>
            ✓ {benefit}
          </Text>
        ))}
      </View>
    </Screen>
  );
}
