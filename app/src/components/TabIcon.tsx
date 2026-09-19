import { ChartTabIcon, GearTabIcon, HomeTabIcon } from './icons';

type Props = {
  name: 'Dashboard' | 'Progress' | 'Settings';
  color: string;
  size?: number;
};

/** Footer icons as in the legacy app: filled house, chart, gear. */
export function TabIcon({ name, color, size = 30 }: Props) {
  if (name === 'Dashboard') return <HomeTabIcon color={color} size={size} />;
  if (name === 'Progress') return <ChartTabIcon color={color} size={size} />;
  return <GearTabIcon color={color} size={size} />;
}
