
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type Props = {
  rating: number;
  count?: number;
};

export default function RatingBadge({ rating, count }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Rated ${rating.toFixed(1)}${count ? ` from ${count} reviews` : ''}`}
    >
      <Ionicons name="star" size={14} color={colors.rating} />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      {count !== undefined ? <Text style={styles.count}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rating: { color: colors.text, fontSize: 14, fontWeight: '600' },
  count: { color: colors.textSecondary, fontSize: 13 },
});