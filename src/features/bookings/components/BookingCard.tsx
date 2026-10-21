import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatShortDate, formatTime12h } from '@/utils/formatDate';
import type { Booking, DisplayStatus } from '../domain/booking.types';

type Props = {
  booking: Booking;
  status: DisplayStatus;
  onPress: () => void;
  /** Pass to show a cancel action. */
  onCancel?: () => void;
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<DisplayStatus, string> = {
  confirmed: colors.primary,
  completed: colors.textSecondary,
  cancelled: colors.alert,
};

export default function BookingCard({ booking, status, onPress, onCancel }: Props) {
  const guests = `${booking.guestCount} ${booking.guestCount === 1 ? 'guest' : 'guests'}`;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${booking.restaurantName}, ${formatShortDate(booking.date)} at ${formatTime12h(
          booking.time,
        )}, ${STATUS_LABEL[status]}`}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {booking.restaurantName}
          </Text>
          <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
        </View>
        <Text style={styles.when}>
          {formatShortDate(booking.date)} • {formatTime12h(booking.time)}
        </Text>
        <Text style={typography.caption}>
          {guests} • {booking.tableLabel}
        </Text>
      </Pressable>

      {onCancel ? (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`Cancel booking at ${booking.restaurantName}`}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>Cancel booking</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },
  body: { padding: spacing.lg, gap: spacing.xs },
  pressed: { opacity: 0.85 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { ...typography.body, fontWeight: 'bold', flex: 1 },
  status: { fontSize: 13, fontWeight: '600' },
  when: { ...typography.body, fontSize: 15 },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.header,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: { color: colors.alert, fontSize: 14, fontWeight: '600' },
});
