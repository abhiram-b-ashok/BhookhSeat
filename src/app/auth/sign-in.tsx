import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ScreenContainer from '@/components/ui/ScreenContainer';
import SignInForm from '@/features/auth/components/SignInForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <ScreenContainer>
      <AppHeader title="Welcome back" subtitle="Sign in to book a table" />
      <SignInForm onSubmit={signIn} onSwitchToSignUp={() => router.push('/auth/sign-up')} />
    </ScreenContainer>
  );
}
