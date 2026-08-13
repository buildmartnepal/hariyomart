import { Text, Pressable } from 'react-native';
import { catalog } from '@/data/catalog';
import { Screen, Header, colors } from '@/components/ui';
export default function Provinces() {
  return (
    <Screen>
      <Header
        title="Seven provinces"
        subtitle="Choose a province to discover regional specialties and delivery coverage."
      />
      {catalog.provinces.map((p, i) => (
        <Pressable
          key={p.slug}
          style={{
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 18,
            padding: 18,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.dark }}>
            {i + 1}. {p.name}
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 21, marginTop: 6 }}>{p.description}</Text>
          <Text style={{ fontWeight: '800', color: '#5C9E25', marginTop: 8 }}>{p.specialty}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
