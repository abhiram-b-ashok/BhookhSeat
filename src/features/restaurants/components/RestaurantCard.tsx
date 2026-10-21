
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatCurrency, formatPriceLevel } from '@/utils/formatCurrency';
import type { Restaurant } from '../domain/restaurant.types';
import RatingBadge from './RatingBadge';
import RestaurantImage from './RestaurantImage';
import { restaurantImages } from '../restaurantImages';



type Props = {
  restaurant: Restaurant;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function RestaurantCard({ restaurant: r, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${r.name}, ${r.cuisine.join(', ')}, rated ${r.rating.toFixed(1)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
<RestaurantImage
  imageSource={restaurantImages[r.id]}
  height={140}
/>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {r.name}
          </Text>
          <RatingBadge rating={r.rating} />
        </View>
        <Text style={typography.caption} numberOfLines={1}>
          {r.cuisine.join(' • ')}
        </Text>
        <Text style={typography.caption} numberOfLines={1}>
          {r.address.area} • {formatPriceLevel(r.priceLevel, r.currency)} •{' '}
          {formatCurrency(r.averageSpendPerPerson, r.currency)} per person
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  body: { padding: spacing.lg, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { ...typography.body, fontWeight: 'bold', flex: 1 },
});