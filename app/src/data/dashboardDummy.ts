// Static placeholder data for Dashboard V1. No real data source is connected.
export const dashboardDummy = {
  week: {
    workouts: 2,
    runs: 1,
    runDistance: '5,2 km',
    steps: '54.280',
    weight: '84,2',
    weightUnit: 'kg',
  },
  weightTrend: {
    value: '84,2 kg',
    change: '-0,6 kg in 4 Wochen',
    points: [84.8, 84.7, 84.5, 84.4, 84.2],
  },
  trainingTrend: {
    summary: '6 Einheiten in 4 Wochen',
    trend: 'Trend: leicht steigend',
    weeklyCounts: [1, 1, 2, 2],
  },
  lastAchievement: {
    title: '5 km Bestzeit',
    value: '29:48',
  },
} as const;
