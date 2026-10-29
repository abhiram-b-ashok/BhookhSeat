import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { bookingRepository } from '@/features/bookings/data/bookingRepository';
import { SubscriptionProvider } from '@/features/subscriptions/hooks/useSubscription';
import { setCrashUser } from '@/services/firebase/crashlytics';
import AppErrorBoundary from '@/components/AppErrorBoundary';

// Keep the splash screen up until we know who is signed in and saved bookings are loaded,
// so no screen flashes the wrong state.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Expo Router shows this instead of a blank screen if a screen throws while rendering. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <AppErrorBoundary {...props} />;
}

function RootNavigator() {
  const { status, user } = useAuth();
  const [bookingsReady, setBookingsReady] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    bookingRepository.hydrate(user?.uid ?? null).finally(() => setBookingsReady(true));
  }, [status, user?.uid]);

  // Crash reports carry the account id only (never an email or a name).
  useEffect(() => {
    if (status !== 'loading') setCrashUser(user?.uid ?? null);
  }, [status, user?.uid]);

  const ready = status !== 'loading' && bookingsReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Protected screens cannot be reached, even by a deep link, unless the guard is true. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="restaurant/[id]" />
          <Stack.Screen name="booking/create" />
          <Stack.Screen name="booking/confirmation" />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="auth/sign-in" />
          <Stack.Screen name="auth/sign-up" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <RootNavigator />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
