import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SectionHeader from '@/components/SectionHeader';
import AppButton from '@/components/ui/AppButton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PLANS, type PlanOption } from '../domain/plans';
import { useOffering } from '../hooks/useOffering';
import { useSubscription } from '../hooks/useSubscription';

const BENEFITS = [
  `Up to ${PLANS.premium.maxActiveBookings} active bookings (Free allows ${PLANS.free.maxActiveBookings})`,
];

function Benefits() {
  return (
    <View style={styles.card}>
      {BENEFITS.map((text) => (
        <View key={text} style={styles.benefit}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.benefitText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function OptionRow({ option, selected, onPress }: { option: PlanOption; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={styles.optionTitle} numberOfLines={2}>
        {option.title}
      </Text>
      <Text style={styles.optionPrice}>{option.priceString}</Text>
    </Pressable>
  );
}

export default function Paywall({ onDone }: { onDone: () => void }) {
  const { state, plan, mode, purchase, restore, retry } = useSubscription();
  const offering = useOffering(state.status === 'ready' && plan === 'free');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (state.status === 'loading') return <LoadingState message="Checking your plan…" />;

  if (state.status === 'unavailable') {
    return (
      <View>
        <EmptyState icon="cloud-offline-outline" title="Subscriptions unavailable" message={state.reason} />
        {mode !== null ? <AppButton title="Try again" variant="secondary" onPress={retry} /> : null}
      </View>
    );
  }

  if (plan === 'premium') {
    return (
      <View>
        <View style={styles.hero}>
          <Ionicons name="star" size={56} color={colors.rating} />
          <Text style={styles.heroTitle}>You are Premium</Text>
          <Text style={typography.caption}>Thank you for supporting the demo.</Text>
        </View>
        <Benefits />
        <View style={styles.actions}>
          <AppButton title="Done" onPress={onDone} />
        </View>
      </View>
    );
  }

  const options = offering.state.status === 'ready' ? offering.state.options : [];
  const chosen = options.find((o) => o.id === selectedId) ?? options[0] ?? null;

  const handleBuy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setMessage(null);
    const outcome = await purchase(chosen.id);
    setBusy(false);
    if (outcome.ok) onDone();
    else setMessage(outcome.message); // null when cancelled: stay quiet
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const outcome = await restore();
    setBusy(false);
    if (!outcome.ok) setMessage(outcome.message);
    else if (outcome.isPremium) onDone();
    else setMessage('No earlier purchases were found for this account.');
  };

  return (
    <View>
      <View style={styles.hero}>
        <Ionicons name="star-outline" size={56} color={colors.rating} />
        <Text style={styles.heroTitle}>BhookhSeat Premium</Text>
        <Text style={typography.caption}>Book more tables at once.</Text>
      </View>

      <Benefits />

      {mode === 'test' ? (
        <Text style={styles.testBanner}>
          Test mode: purchases use RevenueCat's Test Store. No real money is charged.
        </Text>
      ) : null}

      <SectionHeader title="Choose a plan" />

      {offering.state.status === 'loading' ? (
        <LoadingState message="Loading plans…" />
      ) : offering.state.status === 'error' ? (
        <ErrorState title="Could not load plans" message="Check your connection and try again." onRetry={offering.reload} />
      ) : options.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title="No plans available"
          message="Nothing is set up to buy yet. Add products to the current offering in RevenueCat."
        />
      ) : (
        <View style={styles.options}>
          {options.map((o) => (
            <OptionRow key={o.id} option={o} selected={chosen?.id === o.id} onPress={() => setSelectedId(o.id)} />
          ))}
        </View>
      )}

      {message ? (
        <Text style={styles.error} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title={busy ? 'Please wait…' : chosen ? `Subscribe • ${chosen.priceString}` : 'Subscribe'}
          onPress={handleBuy}
          disabled={!chosen || busy}
        />
        <AppButton title="Restore purchases" variant="secondary" onPress={handleRestore} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl },
  heroTitle: { ...typography.title },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitText: { ...typography.body, fontSize: 15, flex: 1 },
  testBanner: { ...typography.caption, fontSize: 12, textAlign: 'center', marginTop: spacing.lg, color: colors.rating },
  options: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.lg,
  },
  optionSelected: { borderColor: colors.primary },
  optionTitle: { ...typography.body, fontWeight: '600', flex: 1 },
  optionPrice: { ...typography.body, fontWeight: 'bold', color: colors.primary },
  error: { color: colors.alert, fontSize: 14, marginTop: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
