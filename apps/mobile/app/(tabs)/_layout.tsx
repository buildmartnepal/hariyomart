import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { useCart } from '@/context/CartContext';
const Icon = ({ x }: { x: string }) => <Text style={{ fontSize: 17 }}>{x}</Text>;
export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  const cart = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F9E1C',
        tabBarInactiveTintColor: '#728079',
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10 },
        tabBarStyle: {
          height: 78,
          paddingTop: 6,
          paddingBottom: 12,
          backgroundColor: dark ? '#10241C' : '#FFFFFF',
          borderTopColor: dark ? '#29473B' : '#DDE7D8',
          shadowColor: '#062D22',
          shadowOpacity: dark ? 0 : 0.1,
          shadowRadius: 16,
          elevation: 14,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Icon x="⌂" /> }} />
      <Tabs.Screen name="nearby" options={{ title: 'Nearby', tabBarIcon: () => <Icon x="◎" /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: () => <Icon x="▦" /> }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell', tabBarIcon: () => <Icon x="🌱" /> }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: () => <Icon x="🧺" />,
          tabBarBadge: cart.count > 0 ? cart.count : undefined,
          tabBarBadgeStyle: { backgroundColor: '#88D92F', color: '#062D22', fontWeight: '900' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Account', tabBarIcon: () => <Icon x="◉" /> }}
      />
      <Tabs.Screen name="provinces" options={{ href: null }} />
    </Tabs>
  );
}
