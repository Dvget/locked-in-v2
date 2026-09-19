import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = {
  title: string;
  description?: string;
  onPress?: () => void;
};

export function Card({ title, description, onPress }: Props) {
  const content = (
    <>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
