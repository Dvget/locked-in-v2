// Small shared controls for the interactive screens (workout, plans, settings, entry sheets).
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  accent?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'secondary', accent = colors.accent, disabled, style }: ButtonProps) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: accent },
        !primary && styles.buttonSecondary,
        danger && { borderColor: 'rgba(255,69,58,0.4)' },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, primary && { color: '#000' }, danger && { color: colors.bad }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children, color = colors.textMuted }: { children: string; color?: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{children}</Text>;
}

export function Heading({ children }: { children: string }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

type StepperProps = {
  title: string;
  value: string;
  unit?: string;
  color?: string;
  onMinus: () => void;
  onPlus: () => void;
};

export function Stepper({ title, value, unit, color = colors.text, onMinus, onPlus }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <Text style={[styles.stepperValue, { color }]}>
        {value}
        {unit ? <Text style={styles.stepperUnit}> {unit}</Text> : null}
      </Text>
      <View style={styles.stepperButtons}>
        <Pressable accessibilityLabel={`${title} verringern`} onPress={onMinus} style={styles.stepperButton}>
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>
        <Pressable accessibilityLabel={`${title} erhöhen`} onPress={onPlus} style={styles.stepperButton}>
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Row({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={[styles.row, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = colors.accent,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: accent }]}
          >
            <Text style={[styles.segmentText, active && { color: '#000' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Full-height sheet used for pickers, editors and completion screens. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>Schließen</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sectionLabel: { color: colors.textMuted, ...typography.label },
  heading: { color: colors.text, fontSize: 22, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  stepper: { flex: 1, backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, gap: 8 },
  stepperValue: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stepperUnit: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  stepperButtons: { flexDirection: 'row', gap: 8 },
  stepperButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: { color: colors.text, fontSize: 24, fontWeight: '500' },
  field: { gap: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  segmented: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 3, gap: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segmentText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sheetClose: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  sheetBody: { padding: spacing.md, gap: spacing.md },
});
