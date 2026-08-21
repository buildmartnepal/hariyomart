import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useCart } from '@/context/CartContext';
import { useMobileColors } from '@/components/ui';
const Icon = ({ x }: { x: string }) => <Text style={{ fontSize: 17 }}>{x}</Text>;
export default function TabsLayout() {
  const palette = useMobileColors();
  const cart = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.green,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10 },
        tabBarStyle: {
          height: 78,
          paddingTop: 6,
          paddingBottom: 12,
          backgroundColor: palette.card,
          borderTopColor: palette.line,
          shadowColor: '#062D22',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 14,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Icon x="⌂" /> }} />
      <Tabs.Screen name="nearby" options={{ title: 'Nearby', tabBarIcon: () => <Icon x="◎" /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: () => <Icon x="▦" /> }} />
      <Tabs.Screen name="sell" options={{ href: null }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: () => <Icon x="🧺" />,
          tabBarBadge: cart.count > 0 ? cart.count : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.accent, color: '#062D22', fontWeight: '900' },
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
