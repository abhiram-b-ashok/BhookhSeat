import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import BackButton from '@/components/ui/BackButton';
import ScreenContainer from '@/components/ui/ScreenContainer';
import Paywall from '@/features/subscriptions/components/Paywall';

export default function PremiumScreen() {
  return (
    <ScreenContainer>
      <BackButton />
      <AppHeader title="Premium" />
      <Paywall onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </ScreenContainer>
  );
}
