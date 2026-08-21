import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { useMobileColors } from '@/components/ui';
export default function Layout() {
  const dark = useColorScheme() === 'dark';
  const palette = useMobileColors();
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style={dark ? 'light' : 'dark'} backgroundColor={palette.bg} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.card },
            headerTintColor: palette.dark,
            headerTitleStyle: { fontWeight: '800' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: 'Product details' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="orders" options={{ title: 'My orders' }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
