import { useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Screen, Header, colors, s } from '@/components/ui';
import sellCampaign from '../../assets/campaigns/sell-from-home.jpg';
const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const mobileHeaders = { 'x-client-platform': 'mobile' };
export default function Sell() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [owner, setOwner] = useState('');
  const [farm, setFarm] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('bagmati');
  const [district, setDistrict] = useState('Kathmandu');
  const [municipality, setMunicipality] = useState('Kathmandu');
  const [ward, setWard] = useState('');
  const [specialties, setSpecialties] = useState('vegetables, seasonal crops');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dash, setDash] = useState<any>(null);
  useEffect(() => {
    SecureStore.getItemAsync('hariyo-farmer-token').then(setToken);
  }, []);
  useEffect(() => {
    if (!token) {
      setDash(null);
      return;
    }
    fetch(`${api}/dashboard/farmer`, {
      headers: { authorization: `Bearer ${token}`, ...mobileHeaders },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setDash)
      .catch(() => setDash(null));
  }, [token]);
  async function persist(data: any) {
    await SecureStore.setItemAsync('hariyo-farmer-token', data.accessToken);
    await SecureStore.setItemAsync('hariyo-mobile-access', data.accessToken);
    if (data.refreshToken)
      await SecureStore.setItemAsync('hariyo-mobile-refresh', data.refreshToken);
    if (data.user) await SecureStore.setItemAsync('hariyo-mobile-user', JSON.stringify(data.user));
    setToken(data.accessToken);
  }
  async function login() {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login failed');
      if (!['farmer', 'vendor', 'admin'].includes(data.user?.role))
        throw new Error('This account is not a farmer seller account.');
      await persist(data);
      setMessage('Farmer workspace connected.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }
  async function register() {
    if (!farm || !owner || !email || !password || !phone || !district || !municipality || !ward)
      return setMessage('Complete all farmer registration fields.');
    setBusy(true);
    setMessage('');
    try {
      let lat = 27.7172,
        lng = 85.324;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      const r = await fetch(`${api}/auth/register-farmer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...mobileHeaders },
        body: JSON.stringify({
          farmName: farm,
          ownerName: owner,
          email,
          password,
          phone,
          province,
          district,
          municipality,
          ward,
          specialties,
          lat,
          lng,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Registration failed');
      if (!data.accessToken) {
        setMessage(
          data.message ||
            'Application validated. Connect the database to create the seller tenant.',
        );
        return;
      }
      await persist(data);
      setMessage(
        'Farmer store created and submitted for verification. You can start adding harvests for review.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      let lat = 27.7172,
        lng = 85.324;
      if (permission.status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      const payload = {
        name,
        category: 'vegetables',
        province,
        district: district || 'Kathmandu',
        municipality: municipality || 'Kathmandu',
        unit: 'kg',
        price: Number(price),
        stock: Number(qty),
        minimumOrder: 1,
        organic: false,
        grade: 'Fresh harvest',
        harvestWindow: 'Listed from farmer mobile app',
        shortDescription: `Fresh ${name} listed directly by a Hariyo Mart farmer.`,
        uniqueStory: `Farmer-listed harvest from ${municipality || district}.`,
        lat,
        lng,
        deliveryRadiusKm: Number(dash?.tenant?.delivery?.radiusKm || 35),
        wholesale: true,
        subscription: false,
      };
      const r = await fetch(`${api}/products`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          ...mobileHeaders,
        },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Unable to publish');
      setName('');
      setQty('');
      setPrice('');
      setMessage(`Harvest submitted: ${data.status || 'pending review'}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to publish');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await Promise.all([
      SecureStore.deleteItemAsync('hariyo-farmer-token'),
      SecureStore.deleteItemAsync('hariyo-mobile-access'),
      SecureStore.deleteItemAsync('hariyo-mobile-refresh'),
      SecureStore.deleteItemAsync('hariyo-mobile-user'),
    ]);
    setToken(null);
    setMessage('Signed out of farmer mode.');
  }
  return (
    <Screen>
      <Header
        title="Farmer Studio"
        subtitle="Run a location-based farmer store from your phone: harvests, live stock, orders and settlement visibility."
      />
      {!token ? (
        <>
          <Image
            source={sellCampaign}
            resizeMode="cover"
            accessibilityLabel="Hariyo Mart seller campaign for farms and home-based fresh suppliers"
            style={{ width: '100%', aspectRatio: 1, borderRadius: 24, marginBottom: 16 }}
          />
          <View
            style={{
              backgroundColor: colors.dark,
              borderRadius: 24,
              padding: 22,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontSize: 12, color: colors.green, fontWeight: '900', letterSpacing: 1.5 }}
            >
              HARIYO SELLER
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', marginTop: 8 }}>
              {mode === 'login' ? 'Connect your farmer account' : 'Open your farm store'}
            </Text>
            <Text style={{ color: '#AFC5BC', lineHeight: 20, marginTop: 6 }}>
              Each farmer gets an isolated tenant, verified location, inventory, orders and payout
              ledger.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => setMode('login')} style={toggle(mode === 'login')}>
                <Text style={toggleText(mode === 'login')}>Sign in</Text>
              </Pressable>
              <Pressable onPress={() => setMode('register')} style={toggle(mode === 'register')}>
                <Text style={toggleText(mode === 'register')}>Create store</Text>
              </Pressable>
            </View>
          </View>
          <View style={card}>
            {mode === 'register' && (
              <>
                <Field label="Farm / cooperative name" value={farm} set={setFarm} />
                <Field label="Farmer / owner name" value={owner} set={setOwner} />
                <Field label="Mobile" value={phone} set={setPhone} keyboard="phone-pad" />
              </>
            )}
            <Field label="Email" value={email} set={setEmail} keyboard="email-address" />
            <Field label="Password" value={password} set={setPassword} secure />
            {mode === 'register' && (
              <>
                <Field label="Province slug" value={province} set={setProvince} />
                <Field label="District" value={district} set={setDistrict} />
                <Field label="Municipality" value={municipality} set={setMunicipality} />
                <Field label="Ward" value={ward} set={setWard} keyboard="number-pad" />
                <Field label="What do you grow?" value={specialties} set={setSpecialties} />
              </>
            )}
            <Pressable
              style={s.button}
              onPress={mode === 'login' ? login : register}
              disabled={busy}
            >
              <Text style={s.buttonText}>
                {busy
                  ? 'Connecting…'
                  : mode === 'login'
                    ? 'Sign in to Farmer Studio'
                    : 'Create my farm store'}
              </Text>
            </Pressable>
            {!!message && <Text style={msg}>{message}</Text>}
          </View>
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor: colors.dark,
              borderRadius: 24,
              padding: 22,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontSize: 12, color: colors.green, fontWeight: '900', letterSpacing: 1.5 }}
            >
              TODAY AT YOUR FARM
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: 'white', marginTop: 8 }}>
              {dash?.tenant?.name || 'Seller connected'}
            </Text>
            <Text style={{ color: '#AFC5BC' }}>
              {dash?.tenant?.status === 'verified' ? 'Verified seller' : 'Verification pending'} ·{' '}
              {dash?.tenant?.delivery?.radiusKm || 35} km local radius
            </Text>
            <Pressable onPress={logout} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
              <Text style={{ color: colors.green, fontWeight: '900' }}>Sign out</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16 }}>
            <Metric
              label="7-day sales"
              value={`NPR ${Math.round(Number(dash?.metrics?.sales7d || 0))}`}
            />
            <Metric label="Open orders" value={String(dash?.metrics?.openOrders || 0)} />
            <Metric label="Live products" value={String(dash?.metrics?.liveProducts || 0)} />
            <Metric
              label="Pending payout"
              value={`NPR ${Math.round(Number(dash?.metrics?.pendingPayout || 0))}`}
            />
          </View>
          <View style={card}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.dark }}>
              List today’s harvest
            </Text>
            <Field label="Product name" value={name} set={setName} />
            <Field
              label="Quantity available (kg)"
              value={qty}
              set={setQty}
              keyboard="decimal-pad"
            />
            <Field label="Price per kg (NPR)" value={price} set={setPrice} keyboard="decimal-pad" />
            <Pressable
              style={s.button}
              onPress={publish}
              disabled={busy || !name || !qty || !price}
            >
              <Text style={s.buttonText}>{busy ? 'Publishing…' : '＋ Publish from my farm'}</Text>
            </Pressable>
            {!!message && <Text style={msg}>{message}</Text>}
          </View>
          <View
            style={{ marginTop: 16, backgroundColor: '#EAF5DF', padding: 16, borderRadius: 18 }}
          >
            <Text style={{ fontWeight: '900', color: colors.dark }}>Your tenant is isolated</Text>
            <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 5 }}>
              Your stock, orders, delivery settings, customers and payouts remain scoped to this
              farmer store.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
function Field({
  label,
  value,
  set,
  keyboard,
  secure,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  keyboard?: any;
  secure?: boolean;
}) {
  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        style={input}
      />
    </View>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        width: '48%',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 16,
        padding: 13,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '800' }}>{label}</Text>
      <Text style={{ fontSize: 18, color: colors.dark, fontWeight: '900', marginTop: 4 }}>
        {value}
      </Text>
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
  } as const,
  msg = { color: colors.muted, lineHeight: 19, marginTop: 12 } as const,
  toggle = (on: boolean) =>
    ({
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 99,
      backgroundColor: on ? colors.green : '#17483A',
    }) as const,
  toggleText = (on: boolean) => ({ fontWeight: '900', color: on ? colors.dark : 'white' }) as const;
