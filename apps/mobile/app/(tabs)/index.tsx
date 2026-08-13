import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { catalog } from '@/data/catalog';
import { Header, ProductGrid, Screen, s, useMobileColors } from '@/components/ui';
import farmerHero from '../../assets/hariyo-farmer-hero-v2.jpg';
export default function Home() {
  const palette = useMobileColors();
  return (
    <Screen>
      <Header
        title="From the nearest farm to your table."
        subtitle="One app for buyers and farmer sellers across Nepal."
      />
      <ImageBackground
        source={farmerHero}
        resizeMode="cover"
        imageStyle={{ borderRadius: 24 }}
        style={s.hero}
        accessibilityLabel="Nepali farmer carrying a basket of fresh produce"
      >
        <View style={s.heroOverlay}>
          <Text
            style={{ fontSize: 11, color: palette.green, fontWeight: '900', letterSpacing: 1.3 }}
          >
            LOCATION-FIRST MARKETPLACE
          </Text>
          <Text style={s.heroTitle}>
            Fresh nearby. {'\n'}
            <Text style={s.heroGreen}>Farmer direct.</Text>
          </Text>
          <Text style={{ color: '#E3EFE9', lineHeight: 22, marginTop: 12 }}>
            Traceable harvests ranked by location, stock and delivery radius.
          </Text>
          <Link href="/(tabs)/nearby" asChild>
            <Pressable style={s.button} accessibilityRole="button">
              <Text style={s.buttonText}>◎ Find food near me</Text>
            </Pressable>
          </Link>
        </View>
      </ImageBackground>
      <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 12, color: palette.dark }}>
        Shop by category
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
        {catalog.categories.map((category) => (
          <Link
            key={category.slug}
            href={{ pathname: '/(tabs)/shop', params: { category: category.slug } }}
            asChild
          >
            <Pressable
              style={{
                width: 112,
                minHeight: 98,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.line,
                borderRadius: 18,
                padding: 13,
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 24 }}>{category.emoji}</Text>
              <Text
                numberOfLines={2}
                style={{ fontSize: 12, fontWeight: '900', color: palette.dark, marginTop: 8 }}
              >
                {category.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <Link href="/(tabs)/sell" asChild>
          <Pressable style={{ flex: 1, backgroundColor: '#DFF2CF', borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 20 }}>🧑‍🌾</Text>
            <Text style={{ fontWeight: '900', color: '#062D22', marginTop: 8 }}>
              Sell what you grow
            </Text>
            <Text style={{ fontSize: 11, color: '#53675E', marginTop: 4 }}>Open farmer mode</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/shop" asChild>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.line,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 20 }}>🧺</Text>
            <Text style={{ fontWeight: '900', color: palette.dark, marginTop: 8 }}>
              Shop all Nepal
            </Text>
            <Text style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>
              Browse marketplace
            </Text>
          </Pressable>
        </Link>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 12, color: palette.dark }}>
        Popular farm products
      </Text>
      <ProductGrid products={catalog.products.filter((product) => product.featured).slice(0, 8)} />
    </Screen>
  );
}
