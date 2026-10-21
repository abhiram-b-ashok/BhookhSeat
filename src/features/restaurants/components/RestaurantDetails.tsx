
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import SectionHeader from '@/components/SectionHeader';
import AppButton from '@/components/ui/AppButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatCurrency, formatPriceLevel } from '@/utils/formatCurrency';
import { formatTime12h } from '@/utils/formatDate';
import type { Restaurant } from '../domain/restaurant.types';
import { getWeekday, WEEKDAYS } from '../domain/restaurantHours';
import CuisineChip from './CuisineChip';
import RatingBadge from './RatingBadge';
import RestaurantImage from './RestaurantImage';
import { restaurantImages } from '../restaurantImages';


type Props = {
  restaurant: Restaurant;
  /** Leave undefined until the booking flow exists; the button stays disabled. */
  onBookPress?: () => void;
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

export default function RestaurantDetails({ restaurant: r, onBookPress }: Props) {
  const today = getWeekday(new Date());
  const [open, close] = r.openingHours[today];
  const { bookingRules: rules } = r;

  return (
    <View>
      <RestaurantImage imageSource={restaurantImages[r.id]} height={200} />

      <Text style={styles.name} accessibilityRole="header">
        {r.name}
      </Text>
      <Text style={styles.tagline}>{r.tagline}</Text>
      <View style={styles.ratingRow}>
        <RatingBadge rating={r.rating} count={r.ratingCount} />
      </View>
      <View style={styles.chips}>
        {r.cuisine.map((c) => (
          <CuisineChip key={c} label={c} />
        ))}
      </View>

      <Text style={styles.description}>{r.description}</Text>

      <View style={styles.infoBlock}>
        <InfoRow
          icon="location-outline"
          text={`${r.address.line1}, ${r.address.area}, ${r.address.city} ${r.address.postalCode}`}
        />
        <InfoRow
          icon="time-outline"
          text={`Today: ${formatTime12h(open)} – ${formatTime12h(close)}`}
        />
        <InfoRow
          icon="wallet-outline"
          text={`${formatPriceLevel(r.priceLevel, r.currency)} • about ${formatCurrency(
            r.averageSpendPerPerson,
            r.currency,
          )} per person`}
        />
      </View>

      <AppButton title="Book a table" onPress={onBookPress ?? (() => {})} disabled={!onBookPress} />
      {!onBookPress ? <Text style={styles.note}>Booking opens in the next phase.</Text> : null}

      <SectionHeader title="Menu highlights" />
      <View style={styles.card}>
        {r.menuHighlights.map((item, index) => (
          <View key={item.id} style={[styles.menuRow, index > 0 && styles.divider]}>
            <View style={styles.menuInfo}>
              <Text style={styles.menuName}>
                {item.name}
                {item.isPopular ? '  ★ Popular' : ''}
              </Text>
              <Text style={typography.caption}>{item.dietary.join(' • ')}</Text>
            </View>
            <Text style={styles.menuPrice}>{formatCurrency(item.price, item.currency)}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Amenities" />
      <View style={styles.chips}>
        {r.amenities.map((a) => (
          <CuisineChip key={a} label={a} />
        ))}
      </View>

      <SectionHeader title="Opening hours" />
      <View style={styles.card}>
        {WEEKDAYS.map((day, index) => {
          const [o, c] = r.openingHours[day];
          const isToday = day === today;
          return (
            <View key={day} style={[styles.hoursRow, index > 0 && styles.divider]}>
              <Text style={[styles.hoursDay, isToday && styles.hoursToday]}>
                {capitalise(day)}
              </Text>
              <Text style={[styles.hoursTime, isToday && styles.hoursToday]}>
                {formatTime12h(o)} – {formatTime12h(c)}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionHeader title="Booking policy" />
      <View style={styles.infoBlock}>
        <InfoRow icon="hourglass-outline" text={`Tables are held for about ${rules.slotDurationMinutes} minutes`} />
        <InfoRow icon="calendar-outline" text={`Book up to ${rules.advanceBookingDays} days ahead`} />
        <InfoRow icon="alarm-outline" text={`${rules.gracePeriodMinutes}-minute arrival grace period`} />
        <InfoRow
          icon="close-circle-outline"
          text={rules.cancellationAllowed ? 'Free cancellation' : 'Cancellation not available'}
        />
      </View>

      <Text style={styles.disclaimer}>
        Sample restaurant. All details are fictional and bookings are simulated.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { ...typography.title, marginTop: spacing.lg },
  tagline: { ...typography.caption, marginTop: spacing.xs },
  ratingRow: { marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  description: { ...typography.body, lineHeight: 24, marginTop: spacing.lg },
  infoBlock: { gap: spacing.md, marginVertical: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoText: { ...typography.body, flex: 1, fontSize: 15 },
  note: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.header },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuInfo: { flex: 1, gap: spacing.xs },
  menuName: { ...typography.body, fontSize: 15, fontWeight: '600' },
  menuPrice: { ...typography.body, fontSize: 15 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  hoursDay: { ...typography.caption },
  hoursTime: { ...typography.caption },
  hoursToday: { color: colors.primary, fontWeight: '600' },
  disclaimer: { ...typography.caption, textAlign: 'center', marginTop: spacing.xxl },
});