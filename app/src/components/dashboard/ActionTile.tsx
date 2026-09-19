import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

type Props = {
  label: string;
  title: string;
  info: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  onPress: () => void;
};

export function ActionTile({
  label,
  title,
  info,
  accent,
  accentSoft,
  accentBorder,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${info}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: accentBorder },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
        <View style={[styles.playCircle, { backgroundColor: accentSoft }]}>
          <View style={[styles.playGlyph, { borderLeftColor: accent }]} />
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.info}>{info}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    gap: 20,
    backgroundColor: colors.card,
    borderRadius: radius.tile,
    borderWidth: 1,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.label,
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bottom: {
    gap: 2,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  info: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
