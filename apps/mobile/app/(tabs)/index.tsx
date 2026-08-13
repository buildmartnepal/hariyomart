import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { catalog } from '@/data/catalog';
import { Screen, Header, ProductCard, s, colors } from '@/components/ui';
export default function Home() {
  return (
    <Screen>
      <Header
        title="From the nearest farm to your table."
        subtitle="One app for buyers and farmer sellers across Nepal."
      />
      <View style={s.hero}>
        <Text style={{ fontSize: 11, color: colors.green, fontWeight: '900', letterSpacing: 1.3 }}>
          LOCATION-FIRST MARKETPLACE
        </Text>
        <Text style={s.heroTitle}>
          Fresh nearby.
          <Text style={s.heroGreen}>Farmer direct.</Text>
        </Text>
        <Text style={{ color: '#BDD0C8', lineHeight: 22, marginTop: 12 }}>
          Discover traceable harvests ranked by your location, availability and delivery radius.
        </Text>
        <Link href="/(tabs)/nearby" asChild>
          <Pressable style={s.button}>
            <Text style={s.buttonText}>◎ Find food near me</Text>
          </Pressable>
        </Link>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <Link href="/(tabs)/sell" asChild>
          <Pressable style={{ flex: 1, backgroundColor: '#E7F4DC', borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 20 }}>🧑‍🌾</Text>
            <Text style={{ fontWeight: '900', color: colors.dark, marginTop: 8 }}>
              Sell what you grow
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              Open farmer mode
            </Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/shop" asChild>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 20 }}>🧺</Text>
            <Text style={{ fontWeight: '900', color: colors.dark, marginTop: 8 }}>
              Shop all Nepal
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              Browse marketplace
            </Text>
          </Pressable>
        </Link>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 12, color: colors.dark }}>
        Popular farm products
      </Text>
      {catalog.products.slice(0, 6).map((p) => (
        <ProductCard p={p} key={p.slug} />
      ))}
    </Screen>
  );
}
