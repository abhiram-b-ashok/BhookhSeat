import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SectionHeader from '@/components/SectionHeader';
import AppButton from '@/components/ui/AppButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Restaurant } from '@/features/restaurants/domain/restaurant.types';
import { formatShortDate, formatTime12h } from '@/utils/formatDate';
import type { Booking } from '../domain/booking.types';
import {
  findFirstBookableDate,
  getBookableDates,
  getMaxGuests,
  getSlots,
} from '../domain/bookingRules';
import { buildSharedDemand } from '../domain/occupancy';
import { useBookings } from '../hooks/useBookings';
import { useOccupancy } from '../hooks/useOccupancy';
import DateTimeSelector from './DateTimeSelector';

type Props = {
  restaurant: Restaurant;
  onBooked: (booking: Booking) => void;
};

function GuestStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Fewer guests"
        style={[styles.stepButton, value <= min && styles.stepDisabled]}
      >
        <Ionicons name="remove" size={22} color={colors.primary} />
      </Pressable>
      <Text style={styles.stepValue} accessibilityLiveRegion="polite">
        {value} {value === 1 ? 'guest' : 'guests'}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="More guests"
        style={[styles.stepButton, value >= max && styles.stepDisabled]}
      >
        <Ionicons name="add" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export default function BookingForm({ restaurant, onBooked }: Props) {
  const { bookings, createBooking } = useBookings();
  const maxGuests = getMaxGuests(restaurant);
  const initialGuests = Math.min(2, maxGuests);

  const [now, setNow] = useState(() => new Date());
  const [guestCount, setGuestCount] = useState(initialGuests);
  const dates = useMemo(() => getBookableDates(restaurant, now), [restaurant, now]);
  const [date, setDate] = useState<string>(
    () =>
      findFirstBookableDate({
        restaurant,
        guestCount: initialGuests,
        existingBookings: bookings,
        now,
      }) ?? dates[0],
  );
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  // Real bookings by other people on the chosen day, live from the server.
  const counts = useOccupancy(restaurant.id, date);
  const demand = useMemo(
    () =>
      buildSharedDemand({
        counts: counts ?? {},
        ownBookings: bookings,
        restaurantId: restaurant.id,
        date,
      }),
    [counts, bookings, restaurant.id, date],
  );

  const slots = useMemo(
    () => getSlots({ restaurant, date, guestCount, existingBookings: bookings, now, demand }),
    [restaurant, date, guestCount, bookings, now, demand],
  );

  // A chosen time only counts while that slot is still bookable (e.g. after changing the guest count).
  const selectedSlot = slots.find((s) => s.time === time && s.status === 'available') ?? null;
  const tableLabel = restaurant.tableInventory.find((t) => t.type === selectedSlot?.tableType)?.label;

  const handleConfirm = async () => {
    if (!selectedSlot || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    try {
      // The server checks the rules and takes the table in one step, so this can still
      // fail even if the slot looked free a moment ago (someone else may have just taken it).
      const result = await createBooking([restaurant], {
        restaurantId: restaurant.id,
        date,
        time: selectedSlot.time,
        guestCount,
      });

      if (result.ok) {
        onBooked(result.value); // the screen is replaced, so there is nothing left to reset
        return;
      }

      inFlight.current = false;
      setSubmitting(false);
      setError(result.error.message);
      setTime(null);
      setNow(new Date()); // refresh so slots that just became too soon are dimmed
    } catch (err: unknown) {
      inFlight.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to confirm booking.');
      setTime(null);
      setNow(new Date());
    }
  };

  return (
    <View>
      <SectionHeader title="Guests" />
      <GuestStepper
        value={guestCount}
        min={1}
        max={maxGuests}
        onChange={(value) => {
          setGuestCount(value);
          setError(null);
        }}
      />
      <Text style={styles.hint}>Up to {maxGuests} guests per booking at this restaurant.</Text>

      <DateTimeSelector
        dates={dates}
        selectedDate={date}
        onSelectDate={(d) => {
          setDate(d);
          setTime(null);
          setError(null);
        }}
        slots={slots}
        selectedTime={selectedSlot ? selectedSlot.time : null}
        onSelectTime={(t) => {
          setTime(t);
          setError(null);
        }}
      />

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {selectedSlot ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {formatShortDate(date)} • {formatTime12h(selectedSlot.time)}
          </Text>
          <Text style={typography.caption}>
            {guestCount} {guestCount === 1 ? 'guest' : 'guests'} • {tableLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.action}>
        <AppButton
          title={submitting ? 'Booking…' : selectedSlot ? 'Confirm booking' : 'Choose a time'}
          onPress={handleConfirm}
          disabled={!selectedSlot || submitting}
        />
      </View>
      <Text style={styles.note}>
        Demo booking. It is saved to your account only; nothing is sent to a real restaurant.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepValue: { ...typography.body, fontWeight: '600' },
  hint: { ...typography.caption, fontSize: 12, marginTop: spacing.sm },
  error: { color: colors.alert, fontSize: 14, marginTop: spacing.lg },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  summaryTitle: { ...typography.body, fontWeight: 'bold' },
  action: { marginTop: spacing.xl },
  note: { ...typography.caption, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
