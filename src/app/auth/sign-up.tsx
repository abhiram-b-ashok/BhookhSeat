import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ScreenContainer from '@/components/ui/ScreenContainer';
import SignUpForm from '@/features/auth/components/SignUpForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignUpScreen() {
  const { signUp } = useAuth();

  return (
    <ScreenContainer>
      <AppHeader title="Create account" subtitle="It takes a few seconds" />
      <SignUpForm onSubmit={signUp} onSwitchToSignIn={() => router.replace('/auth/sign-in')} />
    </ScreenContainer>
  );
}
