import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SectionHeader from '@/components/SectionHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatTime12h, getDateParts } from '@/utils/formatDate';
import type { SlotInfo } from '../domain/booking.types';

type Props = {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: SlotInfo[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
};

export default function DateTimeSelector({
  dates,
  selectedDate,
  onSelectDate,
  slots,
  selectedTime,
  onSelectTime,
}: Props) {
  const hasUnavailable = slots.some((s) => s.status !== 'available');

  return (
    <View>
      <SectionHeader title="Date" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateScroll}
        contentContainerStyle={styles.dateRow}
      >
        {dates.map((date, index) => {
          const parts = getDateParts(date);
          const selected = date === selectedDate;
          return (
            <Pressable
              key={date}
              onPress={() => onSelectDate(date)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${parts.weekday} ${parts.month} ${parts.day}`}
              style={[styles.dateTile, selected && styles.selected]}
            >
              <Text style={[styles.dateSmall, selected && styles.selectedText]}>
                {index === 0 ? 'Today' : parts.weekday}
              </Text>
              <Text style={[styles.dateDay, selected && styles.selectedText]}>{parts.day}</Text>
              <Text style={[styles.dateSmall, selected && styles.selectedText]}>{parts.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="Time" />
      {slots.length === 0 ? (
        <Text style={typography.caption}>No bookable times on this day.</Text>
      ) : (
        <View style={styles.slotRow}>
          {slots.map((slot) => {
            const available = slot.status === 'available';
            const selected = available && slot.time === selectedTime;
            return (
              <Pressable
                key={slot.time}
                disabled={!available}
                onPress={() => onSelectTime(slot.time)}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !available }}
                style={[styles.slot, selected && styles.selected, !available && styles.slotDisabled]}
              >
                <Text style={[styles.slotText, selected && styles.selectedText]}>
                  {formatTime12h(slot.time)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {hasUnavailable ? (
        <Text style={styles.legend}>
          Dimmed times are fully booked, too soon, or overlap another booking of yours.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dateScroll: { marginHorizontal: -spacing.xl },
  dateRow: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  dateTile: {
    width: 64,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: 2,
  },
  dateSmall: { color: colors.textSecondary, fontSize: 12 },
  dateDay: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  slotText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  slotDisabled: { opacity: 0.35 },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: colors.onPrimary },
  legend: { ...typography.caption, fontSize: 12, marginTop: spacing.md },
});
