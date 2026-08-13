import { Stack } from 'expo-router';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
export default function Layout() {
  return (
    <AuthProvider>
      <CartProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#062D22' },
            headerTintColor: '#fff',
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
