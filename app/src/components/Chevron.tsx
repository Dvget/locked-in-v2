import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  color?: string;
};

export function Chevron({ color = colors.textMuted }: Props) {
  return <View style={[styles.chevron, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  chevron: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
