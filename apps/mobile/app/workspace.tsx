import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Header, Screen, useMobileColors } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

const nf = (value: unknown) => new Intl.NumberFormat('en-NP').format(Number(value || 0));
const money = (value: unknown) => `NPR ${nf(Math.round(Number(value || 0)))}`;

export default function Workspace() {
  const palette = useMobileColors();
  const { user, ready, apiRequest } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const role = user?.role || 'customer';
  const endpoint = role === 'admin' ? '/dashboard/admin' : ['farmer', 'vendor'].includes(role) ? '/dashboard/farmer' : '/dashboard/buyer';

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/(tabs)/profile');
      return;
    }
    apiRequest(endpoint).then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load workspace'));
  }, [apiRequest, endpoint, ready, user]);

  const cards = useMemo(() => {
    const metrics = data?.metrics || {};
    if (role === 'admin') return [
      ['Seller tenants', nf(metrics.tenants), `${nf(metrics.pendingFarmers)} pending`],
      ['Live products', nf(metrics.liveProducts), 'Approved inventory'],
      ['Orders', nf(metrics.orders), `${nf(metrics.users)} users`],
      ['GMV', money(metrics.gmv), `${money(metrics.payoutLiability)} liability`],
    ];
    if (['farmer', 'vendor'].includes(role)) return [
      ['Sales · 7d', money(metrics.sales7d), 'Fulfillment value'],
      ['Open orders', nf(metrics.openOrders), 'Need action'],
      ['Inventory', nf(metrics.stockUnits), `${nf(metrics.liveProducts)} listings`],
      ['Payout', money(metrics.pendingPayout), `${nf(metrics.customers)} buyers`],
    ];
    return [
      ['Orders', nf(metrics.orders), `${nf(metrics.delivered)} delivered`],
      ['Rewards', nf(metrics.rewardPoints), 'Hariyo points'],
      ['Saved', nf(metrics.wishlist), 'Products'],
      ['Nearby', 'Live', 'Location matching'],
    ];
  }, [data, role]);

  return (
    <Screen>
      <Header
        title={role === 'admin' ? 'Admin Control' : ['farmer', 'vendor'].includes(role) ? 'Farmer Studio' : 'My Hariyo'}
        subtitle="The same secure marketplace account across web and mobile."
      />
      {!!error && <Text style={{ color: '#B24C45', marginBottom: 12 }}>{error}</Text>}
      {!data ? <Text style={{ color: palette.muted }}>Loading secure workspace…</Text> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {cards.map(([label, value, note]) => (
              <View key={String(label)} style={{ width: '47%', borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, borderRadius: 18, padding: 16 }}>
                <Text style={{ color: palette.muted, fontWeight: '800', fontSize: 11 }}>{String(label).toUpperCase()}</Text>
                <Text style={{ color: palette.dark, fontWeight: '900', fontSize: 24, marginTop: 5 }}>{value}</Text>
                <Text style={{ color: palette.muted, marginTop: 4, fontSize: 12 }}>{note}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 16, borderRadius: 20, padding: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line }}>
            <Text style={{ color: palette.dark, fontWeight: '900', fontSize: 18 }}>Quick actions</Text>
            <Text style={{ color: palette.muted, lineHeight: 20, marginTop: 5 }}>Daily operational visibility is mobile-first; complex administration remains available in the responsive web workspace.</Text>
            <View style={{ gap: 9, marginTop: 14 }}>
              {role === 'admin' && (
                <Pressable onPress={() => router.push('/(tabs)/profile')} style={{ backgroundColor: '#88D92F', padding: 13, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#062D22', textAlign: 'center' }}>Account & security</Text>
                </Pressable>
              )}
              {['farmer', 'vendor'].includes(role) && (
                <Pressable onPress={() => router.push('/(tabs)/sell')} style={{ backgroundColor: '#88D92F', padding: 13, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#062D22', textAlign: 'center' }}>Open seller tools</Text>
                </Pressable>
              )}
              {role === 'customer' && (
                <Pressable onPress={() => router.push('/orders')} style={{ backgroundColor: '#88D92F', padding: 13, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#062D22', textAlign: 'center' }}>View my orders</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push('/(tabs)/shop')} style={{ backgroundColor: palette.card, borderColor: palette.line, borderWidth: 1, padding: 13, borderRadius: 12 }}>
                <Text style={{ fontWeight: '900', color: palette.dark, textAlign: 'center' }}>Open marketplace</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
