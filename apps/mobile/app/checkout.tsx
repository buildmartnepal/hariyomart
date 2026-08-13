import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCart } from '@/context/CartContext';
import { Screen, Header, colors, s } from '@/components/ui';
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
export default function Checkout() {
  const c = useCart();
  const idempotencyKey = useRef('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('bagmati');
  const [district, setDistrict] = useState('Kathmandu');
  const [municipality, setMunicipality] = useState('Kathmandu');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  async function locate() {
    const p = await Location.requestForegroundPermissionsAsync();
    if (p.status !== 'granted') {
      setMessage('Location permission denied. Written address can still be used.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setMessage('Current delivery location attached.');
  }
  async function order() {
    setBusy(true);
    setMessage('');
    try {
      if (!idempotencyKey.current)
        idempotencyKey.current =
          globalThis.crypto?.randomUUID?.() ||
          `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      const payload = {
        lines: c.lines.map((l: any) => ({ productSlug: l.product.slug, quantity: l.quantity })),
        paymentMethod: 'cod',
        guestCustomer: { name, phone },
        deliveryAddress: { province, district, municipality, ward, street, phone, ...coords },
      };
      const r = await fetch(`${api}/orders/guest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-platform': 'mobile',
          'x-idempotency-key': idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Unable to place order');
      c.clear();
      setMessage(`Order received: ${data.orderNumber}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to place order');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Header
        title="Location checkout"
        subtitle="Delivery is calculated seller-by-seller behind one Hariyo order."
      />
      <View style={card}>
        <Text style={title}>Buyer details</Text>
        <Field label="Full name" value={name} set={setName} />
        <Field label="Mobile number" value={phone} set={setPhone} keyboard="phone-pad" />
        <Field label="Province slug" value={province} set={setProvince} />
        <Field label="District" value={district} set={setDistrict} />
        <Field label="Municipality" value={municipality} set={setMunicipality} />
        <Field label="Ward" value={ward} set={setWard} />
        <Field label="Street / landmark" value={street} set={setStreet} />
        <Pressable style={[s.button, { backgroundColor: '#EAF5DF' }]} onPress={locate}>
          <Text style={{ fontWeight: '900', color: colors.dark }}>
            ◎ {coords.lat ? 'Location attached' : 'Use current location'}
          </Text>
        </Pressable>
      </View>
      <View style={[card, { marginTop: 14 }]}>
        <Text style={title}>Order summary</Text>
        {c.lines.map((l: any) => (
          <View
            key={l.product.slug}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ color: colors.dark, fontWeight: '700' }}>
              {l.product.name} × {l.quantity}
            </Text>
            <Text style={{ fontWeight: '900' }}>NPR {l.product.price * l.quantity}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 20, fontWeight: '900', marginTop: 14, color: colors.dark }}>
          Products: NPR {c.total}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
          Seller delivery fees are finalized by the marketplace API.
        </Text>
        <Text style={labelStyle}>Payment method</Text>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 99,
            backgroundColor: colors.green,
          }}
        >
          <Text style={{ fontWeight: '900', color: colors.dark }}>CASH ON DELIVERY</Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 17, marginTop: 8 }}>
          eSewa, Khalti and Fonepay will appear only after Hariyo Mart’s verified merchant accounts
          and payment webhooks are connected.
        </Text>
        <Pressable
          style={s.button}
          onPress={order}
          disabled={busy || !c.lines.length || !name || !phone || !ward || !street}
        >
          <Text style={s.buttonText}>
            {busy ? 'Creating order…' : 'Place cash-on-delivery order'}
          </Text>
        </Pressable>
        {!!message && (
          <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 12 }}>{message}</Text>
        )}
      </View>
      <Pressable onPress={() => router.back()}>
        <Text
          style={{ textAlign: 'center', marginTop: 18, color: colors.muted, fontWeight: '800' }}
        >
          ← Back to cart
        </Text>
      </Pressable>
    </Screen>
  );
}
function Field({
  label,
  value,
  set,
  keyboard,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  keyboard?: any;
}) {
  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TextInput value={value} onChangeText={set} keyboardType={keyboard} style={input} />
    </View>
  );
}
const card = {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 18,
  } as const,
  title = { fontSize: 20, fontWeight: '900', color: colors.dark } as const,
  labelStyle = {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 12,
    marginBottom: 5,
  } as const,
  input = {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F7FAF2',
    borderRadius: 13,
    padding: 13,
    color: colors.dark,
  } as const;
