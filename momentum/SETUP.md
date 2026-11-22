# Momentum: setup

Momentum is a read-mostly front end for your Notion **Daily Driver**. Notion stays the source of
truth; Momentum shows the week, the day, what's done, what isn't and what to attack first.

It can write back **only two checkboxes**: `Workout` and `Hydrate 1.5L` (see `writableHabits` in
`api/_lib/config.js`). Everything else is read-only.

## Try it with demo data (no Notion needed)

```bash
cd momentum
npm run dev        # http://localhost:8000, passcode: demo
npm test           # checks: streaks, pace, auth, the write whitelist
```

The demo uses synthetic data, not your real data.

## Connect your real Notion (about 3 minutes)

1. **Create the integration.** Go to <https://www.notion.so/profile/integrations> -> *New integration*
   -> type **Internal**, name it `Momentum`. Under *Capabilities* tick **Read content** and
   **Update content** (needed for the Workout/Water ticks). Copy the *Internal Integration Secret*.
2. **Share your pages with it.** Open the **Daily Driver** page -> `...` -> *Connections* -> add
   `Momentum`. Everything under Daily Driver (Habits, Daily To-dos, Weekly Goals, Goals, Money,
   Career/Opportunities) is shared automatically. Any database that lives elsewhere must be shared
   separately.
3. **Add environment variables** (Vercel -> Project -> Settings -> Environment Variables):

   | Variable | Value |
   |---|---|
   | `NOTION_TOKEN` | the secret from step 1 |
   | `MOMENTUM_PASSCODE` | the passcode you'll type to open the app |
   | `SESSION_SECRET` | any long random string (32+ chars) |
   | `MOMENTUM_TZ` | optional, defaults to `Africa/Lagos` |
   | `TIM_URL`, `TIM_TOKEN` | optional, see "Tim" below |

4. **Deploy.** Import the repo in Vercel, set **Root Directory = `momentum`** and Framework Preset =
   **Other** (not the repo root: that is the Next.js app). Open the URL and enter your passcode.

To run against real Notion locally: `NOTION_TOKEN=... MOMENTUM_PASSCODE=... npm run dev:live`.

## How fast is "fast"

- The last state is cached on the device, so the app paints instantly.
- It checks for changes every 8s while open and the moment you return to the tab. If nothing
  changed, the server answers with a few bytes.
- Ticking in Momentum updates the screen immediately, then writes to Notion and re-reads.
- All devices share one Notion read per ~4s, staying well inside Notion's rate limit.
- Offline ticks are queued and sent when you're back online.

Notion has no push channel for this, so a tick made in Notion appears within ~8s (or instantly
when you switch back to the app).

## Reusing it next year (quarterly / 12-week)

Nothing is tied to "Week 7" or the current layout:

- Change the planning window with `CYCLE_START`, `CYCLE_END`, `CYCLE_LABEL` (env vars). Pace and
  progress are measured against it.
- **Every checkbox column on Habits is a habit**, so new habits appear automatically.
- If you rename a Notion property, update the name in `api/_lib/config.js` -> `props`.
- A new database: set `NOTION_DS_*` env vars or edit `config.sources`.
- `goalLinks` makes a goal count live from a habit (for example "Workouts completed" follows your
  Workout ticks, so you don't wait for Sunday's manual update).

## Tim (finance)

Momentum reads Tim through one small authenticated JSON endpoint on Tim:

```
GET {TIM_URL}/api/momentum        Authorization: Bearer {TIM_TOKEN}
{
  "currency": "NGN",
  "month":   { "label": "November", "budget": 350000, "spent": 212400,
               "categories": [{ "name": "Food", "budget": 90000, "spent": 61000 }] },
  "savings": [{ "name": "Emergency fund", "saved": 1200, "target": 3000, "currency": "USD" }],
  "recent":  [{ "date": "2026-11-21", "name": "Groceries", "amount": -12400, "category": "Food" }],
  "updatedAt": "2026-11-21T08:00:00Z"
}
```

Until `TIM_URL` is set, the Money page shows a "Connect Tim" card.

## Troubleshooting

- `Notion 404` / `object_not_found`: that database isn't shared with the integration (step 2).
- `Notion 401`: wrong or revoked `NOTION_TOKEN`.
- "No habit row for <date>": the Habits database has no row for that day; Momentum never creates rows.
- Locked out: 5 wrong passcodes pause attempts for a minute.
