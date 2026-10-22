import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { spacing, typography } from '@/constants/theme';
import BookingCard from '@/features/bookings/components/BookingCard';
import type { Booking } from '@/features/bookings/domain/booking.types';
import { getDisplayStatus, partitionBookings } from '@/features/bookings/domain/bookingRules';
import { useBookings } from '@/features/bookings/hooks/useBookings';
import CuisineChip from '@/features/restaurants/components/CuisineChip';
import { formatShortDate, formatTime12h } from '@/utils/formatDate';

type Tab = 'upcoming' | 'past';

export default function BookingsScreen() {
  const { bookings, cancelBooking } = useBookings();
  const [tab, setTab] = useState<Tab>('upcoming');

  const now = new Date();
  const { upcoming, past } = partitionBookings(bookings, now);
  const list = tab === 'upcoming' ? upcoming : past;

  const confirmCancel = (booking: Booking) => {
    Alert.alert(
      'Cancel booking?',
      `${booking.restaurantName}, ${formatShortDate(booking.date)} at ${formatTime12h(booking.time)}`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => {
            const result = cancelBooking(booking.id);
            if (!result.ok) Alert.alert('Could not cancel', result.error.message);
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <AppHeader title="My Bookings" subtitle="Simulated bookings for this demo" />

      <View style={styles.tabs}>
        <CuisineChip
          label={`Upcoming (${upcoming.length})`}
          selected={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        />
        <CuisineChip
          label={`Past (${past.length})`}
          selected={tab === 'past'}
          onPress={() => setTab('past')}
        />
      </View>

      {list.length === 0 ? (
        tab === 'upcoming' ? (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming bookings"
            message="Pick a restaurant and book a table. It will show up here."
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title="No past bookings"
            message="Finished and cancelled bookings appear here."
          />
        )
      ) : (
        <View style={styles.list}>
          {list.map((booking) => {
            const status = getDisplayStatus(booking, now);
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                status={status}
                onPress={() =>
                  router.push({ pathname: '/restaurant/[id]', params: { id: booking.restaurantId } })
                }
                onCancel={
                  status === 'confirmed' && booking.cancellationAllowed
                    ? () => confirmCancel(booking)
                    : undefined
                }
              />
            );
          })}
        </View>
      )}

      {bookings.length > 0 ? (
        <Text style={styles.note}>Bookings are saved on this device only.</Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  list: { gap: spacing.lg },
  note: { ...typography.caption, fontSize: 12, textAlign: 'center', marginTop: spacing.xxl },
});
