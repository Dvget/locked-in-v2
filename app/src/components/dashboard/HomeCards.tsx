// Home cards following the legacy Home screen (D-050): start card with gradient, category cards with icon tile,
// compact card. Sizes come from the design findings (start 92, category 132, compact 92, radius 20).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme';
import { Chevron } from '../Chevron';

const RADIUS = 20;

type StartProps = {
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  onPress: () => void;
};

/** Gradient from accent (22 %) on the left to the card surface on the right, accent border, solid icon tile. */
export function StartCard({ title, subtitle, accent, icon, onPress }: StartProps) {
  const gradientId = `start-${accent.replace('#', '')}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.start, { borderColor: `${accent}38` }, pressed && styles.pressed]}
    >
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.card} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      <View style={[styles.startTile, { backgroundColor: accent }]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.startTitle}>{title}</Text>
        {subtitle ? <Text style={styles.startSubtitle}>{subtitle}</Text> : null}
      </View>
      <Chevron color={accent} />
    </Pressable>
  );
}

type CategoryProps = {
  label: string;
  value: string;
  detail: string;
  valueColor: string;
  detailColor?: string;
  accent: string;
  /** Overrides the default accent-at-9% tile fill (needed for non-hex accents). */
  tileColor?: string;
  icon: ReactNode;
  onPress: () => void;
};

/** 132 high: caption, bold value, secondary line; icon tile 62 with the accent at 9 %. */
export function CategoryCard({ label, value, detail, valueColor, detailColor, accent, tileColor, icon, onPress }: CategoryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.category, pressed && styles.pressed]}
    >
      <View style={[styles.categoryTile, { backgroundColor: tileColor ?? `${accent}17` }]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.caption}>{label}</Text>
        <Text style={[styles.categoryValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.categoryDetail, { color: detailColor ?? valueColor }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Chevron color={accent} />
    </Pressable>
  );
}

type CompactProps = {
  title: string;
  detail?: string;
  detailColor?: string;
  icon: ReactNode;
  onPress: () => void;
};

/** 92 high compact card (weight). */
export function CompactCard({ title, detail, detailColor, icon, onPress }: CompactProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.compact, pressed && styles.pressed]}
    >
      <View style={[styles.compactTile, { backgroundColor: colors.cardSecondary }]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.compactTitle}>{title}</Text>
        {detail ? <Text style={[styles.compactDetail, detailColor ? { color: detailColor } : null]}>{detail}</Text> : null}
      </View>
      <Chevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.75 },
  start: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  startTile: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  startTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  startSubtitle: { color: colors.textMuted, fontSize: 13 },
  category: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryTile: { width: 62, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  caption: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  categoryValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  categoryDetail: { fontSize: 15 },
  compact: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  compactTile: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  compactTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  compactDetail: { color: colors.textMuted, fontSize: 14 },
});
