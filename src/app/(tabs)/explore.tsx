
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function ExploreScreen() {
  return (
    <ScreenContainer>
      <AppHeader title="Explore" subtitle="Search and filter by cuisine" />
      <EmptyState icon="search-outline" title="Search is on the way" />
    </ScreenContainer>
  );
}