import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function ProfileScreen() {
  return (
    <ScreenContainer>
      <AppHeader title="Profile" />
      <EmptyState
        icon="person-outline"
        title="Account features later"
        message="Settings and sign-in arrive in a later phase."
      />
    </ScreenContainer>
  );
}