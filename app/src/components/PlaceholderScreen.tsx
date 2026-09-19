import { StyleSheet, Text } from 'react-native';

import { colors } from '../theme';
import { Card } from './Card';
import { Screen } from './Screen';

type Props = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: Props) {
  return (
    <Screen>
      <Text style={styles.heading}>{title}</Text>
      <Card title="Placeholder" description={description} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
});
