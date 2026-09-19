import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import { LogoMark } from '../icons';

// Brand header as in the legacy app (D-050): logo mark, "LOCKED" white, "IN" orange, centered.
export function DashboardHeader() {
  return (
    <View style={styles.container} accessibilityRole="header">
      <LogoMark color={colors.accent} size={22} />
      <Text style={styles.brand}>
        <Text style={styles.locked}>LOCKED </Text>
        <Text style={styles.in}>IN</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  brand: { fontSize: 13 },
  locked: { color: colors.text, fontWeight: '600', letterSpacing: 3 },
  in: { color: colors.accent, fontWeight: '600', letterSpacing: 2.4 },
});
