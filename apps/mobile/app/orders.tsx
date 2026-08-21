import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, colors } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { catalog, type Product } from '@/data/catalog';
const mobileProducts: readonly Product[] = catalog.products;
export default function Orders() {
  const { user, apiRequest } = useAuth();
  const cart = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!user) return;
    apiRequest('/dashboard/buyer')
      .then((d: any) => setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Unable to load orders'));
  }, [apiRequest, user]);
  return (
    <Screen>
      <Header
        title="My orders"
        subtitle="One Hariyo order may contain several farmer fulfillments."
      />
      {!user ? (
        <View style={card}>
          <Text style={title}>Sign in required</Text>
          <Text style={copy}>Open Account and sign in to see your order history.</Text>
        </View>
      ) : orders.length ? (
        orders.map((o) => (
          <View key={o._id} style={card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View>
                <Text style={{ fontWeight: '900', color: colors.dark }}>{o.orderNumber}</Text>
                <Text style={copy}>
                  {new Date(o.createdAt).toLocaleDateString()} · {o.status}
                </Text>
              </View>
              <Text style={{ fontWeight: '900', color: colors.dark }}>
                NPR {Math.round(Number(o.total || 0))}
              </Text>
            </View>
            <Text style={[copy, { marginTop: 8 }]}>
              {o.deliveryAddress?.municipality}, {o.deliveryAddress?.district}
            </Text>
            {!!o.items?.length && (
              <Pressable
                style={{ backgroundColor: '#EAF7DF', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, marginTop: 10 }}
                onPress={() => {
                  let restored = 0;
                  for (const item of o.items) {
                    const product = mobileProducts.find((p) => p.slug === item.productSlug);
                    if (!product) continue;
                    cart.add(product, Number(item.quantity || product.minimumOrder || 1));
                    restored += 1;
                  }
                  setMessage(restored ? `${restored} product${restored === 1 ? '' : 's'} added to cart.` : 'Those products are not currently available.');
                }}
              >
                <Text style={{ color: '#153D2B', fontWeight: '900', textAlign: 'center' }}>↻ Reorder this basket</Text>
              </Pressable>
            )}
            <View style={{ marginTop: 10 }}>
              {(o.fulfillments || []).map((f: any) => (
                <View
                  key={f._id}
                  style={{
                    backgroundColor: '#F7FAF2',
                    padding: 10,
                    borderRadius: 11,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: colors.dark }}>
                    {f.status.replaceAll('_', ' ')}
                  </Text>
                  <Text style={copy}>
                    Seller total NPR {Math.round(Number(f.total || 0))} · payout {f.payoutStatus}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={card}>
          <Text style={title}>No orders yet</Text>
          <Text style={copy}>
            {message || 'Use Nearby to find produce that can deliver to you.'}
          </Text>
        </View>
      )}
      <Pressable onPress={() => router.back()}>
        <Text
          style={{ textAlign: 'center', color: colors.muted, fontWeight: '800', marginTop: 15 }}
        >
          ← Back
        </Text>
      </Pressable>
    </Screen>
  );
}
const card = {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  } as const,
  title = { fontSize: 19, fontWeight: '900', color: colors.dark } as const,
  copy = { fontSize: 12, color: colors.muted, lineHeight: 18 } as const;
