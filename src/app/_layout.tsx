import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { bookingRepository } from '@/features/bookings/data/bookingRepository';

// Keep the splash screen up until we know who is signed in and saved bookings are loaded,
// so no screen flashes the wrong state.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { status } = useAuth();
  const [bookingsReady, setBookingsReady] = useState(false);

  useEffect(() => {
    // hydrate() never rejects: on a storage problem the app simply starts empty.
    bookingRepository.hydrate().finally(() => setBookingsReady(true));
  }, []);

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
      <RootNavigator />
    </AuthProvider>
  );
}
