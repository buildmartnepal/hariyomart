import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
const Icon = ({ x }: { x: string }) => <Text style={{ fontSize: 17 }}>{x}</Text>;
export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F9E1C',
        tabBarInactiveTintColor: '#728079',
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10 },
        tabBarStyle: {
          height: 74,
          paddingTop: 6,
          paddingBottom: 10,
          backgroundColor: dark ? '#10241C' : '#FFFFFF',
          borderTopColor: dark ? '#29473B' : '#DDE7D8',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Icon x="⌂" /> }} />
      <Tabs.Screen name="nearby" options={{ title: 'Nearby', tabBarIcon: () => <Icon x="◎" /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: () => <Icon x="▦" /> }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell', tabBarIcon: () => <Icon x="🌱" /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: () => <Icon x="🧺" /> }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Account', tabBarIcon: () => <Icon x="◉" /> }}
      />
      <Tabs.Screen name="provinces" options={{ href: null }} />
    </Tabs>
  );
}
