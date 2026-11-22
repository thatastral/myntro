// Everything that ties Momentum to a specific Notion setup lives here.
// Next year, when the Daily Driver becomes quarterly / 12-week, change the
// cycle dates (env vars) or the property names below - no other code changes.
const env = process.env;

export const config = {
  tz: env.MOMENTUM_TZ || 'Africa/Lagos',

  // The planning window progress & pace are measured against.
  cycle: {
    start: env.CYCLE_START || '2026-10-04',
    end: env.CYCLE_END || '2026-12-31',
    label: env.CYCLE_LABEL || 'Oct 4 - Dec 31',
  },

  // Notion data source IDs (not secret; useless without the integration token).
  sources: {
    habits: env.NOTION_DS_HABITS || '1875b725-7942-4de2-aae4-c0830bb8fd66',
    todos: env.NOTION_DS_TODOS || '9dd2b9df-cfbf-4ce3-a5f0-ecfef7fb650b',
    weeklyGoals: env.NOTION_DS_WEEKLY_GOALS || '2ed99c6d-e9be-440c-9d4b-29d448b5d505',
    goals: env.NOTION_DS_GOALS || 'd937d53b-5555-4145-bef9-71862abf7be7',
    money: env.NOTION_DS_MONEY || '3c8c9acd-f6f5-40d8-b78a-23543ac9befc',
    career: env.NOTION_DS_CAREER || '928c0d37-0e42-4794-8005-46cc38a54657',
  },

  // Notion property names, per source.
  props: {
    habits: { title: 'Day', date: 'Date' },
    todos: { title: 'Task', status: 'Status', slot: 'Slot', date: 'Date', time: 'Time', doneWhen: 'Done when', notes: 'Notes' },
    weeklyGoals: {
      title: 'Goal/outcome', status: 'Status', category: 'Category', priority: 'Priority', slot: 'Slot',
      start: 'Start date', end: 'End date', deadline: 'Deadline', stretch: 'Stretch challenge',
      timeBlock: 'Time block', doneWhen: 'Done when', notes: 'Notes',
    },
    goals: {
      title: 'Goal', category: 'Category', status: 'Status', priority: 'Priority', current: 'Current',
      logged: 'Logged (Money)', target: 'Target', deadline: 'Deadline', notes: 'Notes',
    },
    money: { title: 'Description', type: 'Type', currency: 'Currency', amount: 'Amount', status: 'Status', date: 'Date', goal: 'Goal' },
    career: {
      title: 'Company/person', type: 'Opportunity type', stage: 'Stage', role: 'Role/service', value: 'Value',
      next: 'Next action', nextDate: 'Next action date', contacted: 'Date contacted', notes: 'Notes',
    },
  },

  // Every checkbox column on the Habits database is treated as a habit.
  // This only adds nicer labels / grouping; unknown habits still appear.
  habitOrder: [
    'Morning devotional', 'Workout', 'Hydrate 1.5L', 'Reading', 'Read an article', 'Building taste',
    'Listen to podcasts', 'Journal', 'Plan tomorrow', 'Work on side project',
  ],
  habitMeta: {
    'Morning devotional': { label: 'Devotional', icon: 'sun', group: 'Faith' },
    'Workout': { label: 'Workout', icon: 'bolt', group: 'Health' },
    'Hydrate 1.5L': { label: 'Water 1.5L', icon: 'drop', group: 'Health' },
    'Reading': { label: 'Reading', icon: 'book', group: 'Learning' },
    'Read an article': { label: 'Article', icon: 'doc', group: 'Learning' },
    'Building taste': { label: 'Taste', icon: 'eye', group: 'Learning' },
    'Listen to podcasts': { label: 'Podcast', icon: 'headphones', group: 'Learning' },
    'Journal': { label: 'Journal', icon: 'pen', group: 'Reflect' },
    'Plan tomorrow': { label: 'Plan tomorrow', icon: 'calendar', group: 'Reflect' },
    'Work on side project': { label: 'Side project', icon: 'code', group: 'Build' },
  },

  // The ONLY habits Momentum may write back to Notion (read-only for the rest).
  writableHabits: ['Workout', 'Hydrate 1.5L'],

  // Goals whose progress should follow a habit's live tick count
  // (so you don't wait for Sunday's manual "Current" update).
  goalLinks: [
    { match: 'workout', habit: 'Workout' },
    { match: 'devotional', habit: 'Morning devotional' },
  ],

  // Weekly workout target shown on the Fitness ring (override with FITNESS_WEEKLY_TARGET).
  targets: { workoutsPerWeek: Number(env.FITNESS_WEEKLY_TARGET) || 4 },

  // How far back habit rows are loaded (days before cycle start are ignored).
  habitFutureDays: 7,
};

export default config;
