export const todayIn = (tz, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export const timeIn = (tz, now = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const fmt = d => d.toISOString().slice(0, 10);
export const addDays = (k, n) => { const d = parse(k); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
export const weekStart = k => addDays(k, -((parse(k).getUTCDay() + 6) % 7)); // Monday
export const dayLabel = k => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parse(k).getUTCDay()];
