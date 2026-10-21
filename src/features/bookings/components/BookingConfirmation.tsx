import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatShortDate, formatTime12h } from '@/utils/formatDate';
import type { Booking } from '../domain/booking.types';

type Props = {
  booking: Booking;
  onViewBookings: () => void;
  onGoHome: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function BookingConfirmation({ booking, onViewBookings, onGoHome }: Props) {
  const reference = booking.id.slice(-6).toUpperCase();

  return (
    <View>
      <View style={styles.hero}>
        <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
        <Text style={styles.title} accessibilityRole="header">
          Booking confirmed
        </Text>
        <Text style={styles.subtitle}>Your table is reserved in this demo.</Text>
      </View>

      <View style={styles.card}>
        <Row label="Restaurant" value={booking.restaurantName} />
        <Row label="Date" value={formatShortDate(booking.date)} />
        <Row label="Time" value={formatTime12h(booking.time)} />
        <Row
          label="Party"
          value={`${booking.guestCount} ${booking.guestCount === 1 ? 'guest' : 'guests'}`}
        />
        <Row label="Table" value={booking.tableLabel} />
        <Row label="Reference" value={reference} />
      </View>

      <Text style={styles.disclaimer}>
        This is a simulated booking. No real reservation was made and nothing was sent to the
        restaurant.
      </Text>

      <View style={styles.actions}>
        <AppButton title="View my bookings" onPress={onViewBookings} />
        <AppButton title="Back to home" variant="secondary" onPress={onGoHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl },
  title: { ...typography.title },
  subtitle: typography.caption,
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  value: { ...typography.body, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  disclaimer: { ...typography.caption, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
