import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen, Header, colors, s } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
export default function Profile() {
  const { user, ready, login, demoLogin, registerBuyer, logout, apiRequest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  useEffect(() => {
    if (user)
      apiRequest('/account/me')
        .then((x: any) => setProfile(x.profile))
        .catch(() => {});
    else setProfile(null);
  }, [apiRequest, user]);
  useEffect(() => {
    if (user) { setDemoAvailable(false); return; }
    const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    fetch(`${base}/demo-config`, { headers: { 'x-client-platform': 'mobile' } })
      .then((response) => setDemoAvailable(response.ok))
      .catch(() => setDemoAvailable(false));
  }, [user]);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const user =
        mode === 'login'
          ? await login(email, password)
          : await registerBuyer({ name, email, password, phone });
      setMessage(`Signed in as ${user.name}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <Screen>
        <Header title="My Hariyo" subtitle="Loading account…" />
      </Screen>
    );
  return (
    <Screen>
      <Header
        title={user ? `Namaste, ${user.name}` : 'My Hariyo account'}
        subtitle={
          user
            ? 'Orders, delivery places and account preferences across web and mobile.'
            : 'Sign in as a buyer, farmer or admin. Buyer accounts can also be created here.'
        }
      />
      {!user ? (
        <>
          <View style={{ backgroundColor: colors.dark, borderRadius: 24, padding: 22 }}>
            <Text
              style={{ color: colors.green, fontWeight: '900', letterSpacing: 1.4, fontSize: 11 }}
            >
              ONE HARIYO IDENTITY
            </Text>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 28, marginTop: 7 }}>
              {mode === 'login' ? 'Sign in' : 'Create buyer account'}
            </Text>
            <Text style={{ color: '#AFC5BC', lineHeight: 20, marginTop: 6 }}>
              Your login works across the marketplace. Farmer onboarding remains in the Sell tab.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => setMode('login')} style={pill(mode === 'login')}>
                <Text style={pillText(mode === 'login')}>Sign in</Text>
              </Pressable>
              <Pressable onPress={() => setMode('register')} style={pill(mode === 'register')}>
                <Text style={pillText(mode === 'register')}>Register</Text>
              </Pressable>
            </View>
          </View>
          {demoAvailable && mode === 'login' && (
            <View style={demoCard}>
              <Text style={demoEyebrow}>DEMO LAB</Text>
              <Text style={demoTitle}>Open a test workspace instantly</Text>
              <Text style={demoCopy}>No demo password is required for one-click Test Mode sessions.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {[
                  ['Buyer','buyer@demo.hariyomart.local'],
                  ['Farmer','farmer@demo.hariyomart.local'],
                  ['Admin','admin@demo.hariyomart.local'],
                ].map(([label, demoEmail]) => (
                  <Pressable key={demoEmail} style={demoPill} disabled={busy} onPress={async () => {
                    setBusy(true); setMessage('');
                    try { const opened = await demoLogin(demoEmail); setMessage(`Opened ${opened.name}.`); }
                    catch (e) { setMessage(e instanceof Error ? e.message : 'Demo unavailable'); }
                    finally { setBusy(false); }
                  }}>
                    <Text style={demoPillText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View style={card}>
            {mode === 'register' && <Field label="Full name" value={name} set={setName} />}
            <Field label="Email" value={email} set={setEmail} keyboard="email-address" />
            <Field label="Password" value={password} set={setPassword} secure />
            {mode === 'register' && (
              <Field label="Mobile" value={phone} set={setPhone} keyboard="phone-pad" />
            )}
            <Pressable
              style={s.button}
              disabled={busy || !email || !password || (mode === 'register' && !name)}
              onPress={submit}
            >
              <Text style={s.buttonText}>
                {busy
                  ? 'Connecting…'
                  : mode === 'login'
                    ? 'Sign in securely'
                    : 'Create buyer account'}
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
              marginBottom: 15,
            }}
          >
            <Text
              style={{ color: colors.green, fontWeight: '900', fontSize: 11, letterSpacing: 1.3 }}
            >
              {String(user.role).toUpperCase()} WORKSPACE
            </Text>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 30, marginTop: 6 }}>
              {user.name}
            </Text>
            <Text style={{ color: '#AFC5BC', marginTop: 5 }}>
              {profile?.email || user.email || ''}
            </Text>
          </View>
          <Link href="/orders" asChild>
            <Pressable style={menu}>
              <Text style={menuText}>📦 My orders</Text>
              <Text>→</Text>
            </Pressable>
          </Link>
          <Link href="/(tabs)/nearby" asChild>
            <Pressable style={menu}>
              <Text style={menuText}>◎ Nearby farms</Text>
              <Text>→</Text>
            </Pressable>
          </Link>
          <View style={menu}>
            <Text style={menuText}>🏠 Saved addresses</Text>
            <Text>{profile?.addresses?.length || 0}</Text>
          </View>
          <View style={menu}>
            <Text style={menuText}>★ Hariyo rewards</Text>
            <Text>{profile?.rewardPoints || 0} pts</Text>
          </View>
          <View style={menu}>
            <Text style={menuText}>♡ Saved products</Text>
            <Text>{profile?.wishlist?.length || 0}</Text>
          </View>
          {['farmer', 'vendor', 'admin'].includes(user.role) && (
            <Link href="/(tabs)/sell" asChild>
              <Pressable style={[menu, { backgroundColor: '#EAF5DF' }]}>
                <Text style={menuText}>🌱 Open Farmer Studio</Text>
                <Text>→</Text>
              </Pressable>
            </Link>
          )}
          <Pressable onPress={() => logout()} style={[s.button, { backgroundColor: '#F1F4EF' }]}>
            <Text style={{ fontWeight: '900', color: colors.dark }}>Sign out</Text>
          </Pressable>
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
const demoCard = { backgroundColor: '#EAF7DF', borderWidth: 1, borderColor: '#B9DCA0', borderRadius: 20, padding: 16, marginTop: 14 } as const;
const demoEyebrow = { color: '#24733D', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 } as const;
const demoTitle = { color: colors.dark, fontWeight: '900', fontSize: 20, marginTop: 4 } as const;
const demoCopy = { color: colors.muted, marginTop: 4, lineHeight: 19 } as const;
const demoPill = { backgroundColor: '#153D2B', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 } as const;
const demoPillText = { color: 'white', fontWeight: '900', fontSize: 12 } as const;

const card = {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
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
  msg = { color: colors.muted, lineHeight: 20, marginTop: 12 } as const,
  menu = {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as const,
  menuText = { fontWeight: '800', color: colors.dark } as const,
  pill = (on: boolean) =>
    ({
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 99,
      backgroundColor: on ? colors.green : '#17483A',
    }) as const,
  pillText = (on: boolean) => ({ fontWeight: '900', color: on ? colors.dark : 'white' }) as const;
