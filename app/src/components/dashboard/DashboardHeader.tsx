import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';

// Brand header as in the legacy app (D-050): "LOCKED" white, "IN" orange, centered.
export function DashboardHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand} accessibilityRole="header">
        <Text style={styles.locked}>LOCKED </Text>
        <Text style={styles.in}>IN</Text>
      </Text>
      <Text style={styles.subtitle}>Diese Woche</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  brand: {
    fontSize: 14,
  },
  locked: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 2,
  },
  in: {
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
