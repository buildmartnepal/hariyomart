import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Screen, Header, s, colors } from '@/components/ui';
export default function Cart() {
  const c = useCart();
  return (
    <Screen>
      <Header
        title={`Your basket (${c.count})`}
        subtitle="One cart can contain products from multiple independent farmer stores."
      />
      {c.lines.length === 0 ? (
        <Text style={{ color: colors.muted }}>Your basket is empty.</Text>
      ) : (
        c.lines.map((l: any) => (
          <View
            key={l.product.slug}
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ fontWeight: '800', color: colors.dark }}>{l.product.name}</Text>
            <Text style={{ color: colors.muted }}>
              Qty {l.quantity} · NPR {l.product.price * l.quantity}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                accessibilityLabel={`Decrease ${l.product.name} quantity`}
                onPress={() => c.update(l.product.slug, l.quantity - 1)}
                style={quantityButton}
              >
                <Text style={{ fontWeight: '900' }}>−</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Increase ${l.product.name} quantity`}
                disabled={l.quantity >= l.product.stock}
                onPress={() => c.update(l.product.slug, l.quantity + 1)}
                style={[quantityButton, l.quantity >= l.product.stock && { opacity: 0.4 }]}
              >
                <Text style={{ fontWeight: '900' }}>+</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${l.product.name} from basket`}
                onPress={() => c.update(l.product.slug, 0)}
                style={[quantityButton, { paddingHorizontal: 12 }]}
              >
                <Text style={{ fontWeight: '800', color: '#8E2B21' }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.dark }}>
          Products: NPR {c.total}
        </Text>
        {c.lines.length > 0 && (
          <Link href="/checkout" asChild>
            <Pressable style={s.button}>
              <Text style={s.buttonText}>Continue to location checkout</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </Screen>
  );
}

const quantityButton = {
  minWidth: 42,
  minHeight: 42,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 12,
  backgroundColor: '#F7FAF2',
} as const;
