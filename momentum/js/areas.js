// One hue per life area, used consistently everywhere (rings, tiles, heatmaps, charts).
// 1 blue Faith · 2 coral Health · 3 teal Money · 4 amber Learning · 5 pink Career/Brand/Build · 6 slate Reflect/other
const MAP = { Faith: 1, Health: 2, Money: 3, Learning: 4, Career: 5, 'Personal Brand': 5, Build: 5, Reflect: 6, 'Long-term': 6, Habits: 6 };
export const areaN = name => MAP[name] || 6;
export const GROUP_ICON = { Faith: 'sun', Health: 'bolt', Learning: 'book', Reflect: 'pen', Build: 'code' };
// Stable colour per name (colour follows the entity, never its rank).
export const colorFor = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `var(--c${(h % 6) + 1})`; };
