import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import SectionHeader from '@/components/SectionHeader';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { colors, radii, spacing, typography } from '@/constants/theme';
import AppButton from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { mapAuthError } from '@/features/auth/domain/authErrors';
import { partitionBookings } from '@/features/bookings/domain/bookingRules';
import { useBookings } from '@/features/bookings/hooks/useBookings';

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { bookings, clearBookings } = useBookings();
  const { upcoming } = partitionBookings(bookings, new Date());
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  const confirmClear = () => {
    Alert.alert(
      'Clear all bookings?',
      'This removes every booking, including past and cancelled ones, from this device. It cannot be undone.',
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: clearBookings },
      ],
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Could not sign out', mapAuthError(error));
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title="Profile" subtitle={user?.email ?? 'Signed in'} />

      <View style={styles.account}>
        <Text style={styles.accountName}>{user?.displayName ?? 'Welcome'}</Text>
        <AppButton title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>

      <SectionHeader title="Activity" />

      <View style={styles.card}>
        <StatRow label="Total bookings" value={bookings.length} />
        <StatRow label="Upcoming" value={upcoming.length} />
        <StatRow label="Cancelled" value={cancelled} />
      </View>

      <SectionHeader title="Data" />
      <Text style={styles.body}>
        Bookings are saved on this device only. Clearing them also frees the simulated tables
        they were holding.
      </Text>
      <Pressable
        onPress={confirmClear}
        disabled={bookings.length === 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: bookings.length === 0 }}
        style={[styles.danger, bookings.length === 0 && styles.dangerDisabled]}
      >
        <Text style={styles.dangerText}>Clear all bookings</Text>
      </Pressable>

      <SectionHeader title="About" />
      <Text style={styles.body}>
        BhookhSeat is a portfolio demo. The restaurants are fictional, availability is simulated,
        and no real reservations or payments are made.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  account: { gap: spacing.lg },
  accountName: { ...typography.body, fontSize: 20, fontWeight: 'bold' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { ...typography.body, fontWeight: 'bold' },
  body: { ...typography.caption, lineHeight: 21 },
  danger: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.alert,
  },
  dangerDisabled: { opacity: 0.35 },
  dangerText: { color: colors.alert, fontSize: 16, fontWeight: 'bold' },
});
