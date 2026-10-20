
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function BookingsScreen() {
  return (
    <ScreenContainer>
      <AppHeader title="My Bookings" />
      <EmptyState
        icon="calendar-outline"
        title="No bookings yet"
        message="Your upcoming and past bookings will show up here."
      />
    </ScreenContainer>
  );
}