
import AppHeader from '@/components/AppHeader';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { formatLongDate } from '@/utils/formatDate';

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <AppHeader title="BhookhSeat" subtitle={formatLongDate()} />
      <SectionHeader title="Featured Restaurants" />
      <EmptyState
        icon="restaurant-outline"
        title="Restaurants coming soon"
        message="Sample restaurants will appear here in the next phase."
      />
    </ScreenContainer>
  );
}