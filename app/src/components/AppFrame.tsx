import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  children: ReactNode;
};

// Web preview only: limits the app to a phone-like width. Native renders children unchanged.
export function AppFrame({ children }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.app}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.backdrop,
  },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
