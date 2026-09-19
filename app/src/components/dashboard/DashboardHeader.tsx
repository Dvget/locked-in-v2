import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';

export function DashboardHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>LOCKED IN</Text>
      <Text style={styles.subtitle}>Diese Woche</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
    paddingTop: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
