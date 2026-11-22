# Momentum handoff (continue in a local Claude Code session)

Repo: thatastral/myntro, branch `ccr-c049a876-k1jmlf` (check it out first; push only to this branch, never main; no PR unless asked).
App: `momentum/` (dependency-free; static front end + Vercel functions in `momentum/api/`). Read `momentum/SETUP.md` first.
Run `cd momentum && npm test` (15 checks pass) and `npm run dev` (demo data, passcode `demo`, http://localhost:8000).

## Why this was handed off
The cloud session had no Claude-in-Chrome, no access to the owner's Mac, and no tokens. The browser, Tim and
Vercel work therefore did NOT happen. Run the next session LOCALLY on the Mac (Claude Desktop, or
`claude remote-control` in the repo folder) so it can use the logged-in Chrome and the Tim folder.

## Done so far
- Checked out the branch; `npm test` passes.
- Verified `momentum/api/_lib/config.js` against the LIVE Notion schemas (via the Notion connector). All six
  data-source IDs resolve to the right databases, and every property name/type in `config.props` matches:
  - Habits `1875b725-…`: `Day` (title), `Date` (date), checkboxes incl. `Workout` and `Hydrate 1.5L`.
  - Daily To-dos `9dd2b9df-…`: `Task`, `Status` (select), `Slot` (select), `Date`, `Time`, `Done when`, `Notes`.
  - Weekly Goals `2ed99c6d-…`: `Goal/outcome`, `Status`, `Category`, `Priority`, `Slot`, `Start date`, `End date`,
    `Deadline`, `Stretch challenge` (checkbox), `Time block`, `Done when`, `Notes`.
  - Goals `d937d53b-…`: `Goal`, `Category`, `Status` (options incl. "At risk"), `Priority`, `Current`, `Target`,
    `Deadline`, `Notes`; `Logged (Money)` is a ROLLUP (sum) of Money's `Counted amount` formula -> API returns
    `rollup.type = number`.
  - Money `3c8c9acd-…`: `Description`, `Type`, `Currency` (USD/NGN), `Amount`, `Status` (Received/Pending), `Date`, `Goal`.
  - Career `928c0d37-…`: `Company/person`, `Opportunity type`, `Stage`, `Role/service`, `Value`, `Next action`,
    `Next action date`, `Date contacted`, `Notes`.
- `Status`/`Slot` are `select` (not Notion "status" type); `val()` in `api/_lib/notion.js` handles select, number
  rollup and formula. Notion-Version `2025-09-03` + `/data_sources/{id}/query` match the data-source API.
- No code changes were made. Nothing committed or pushed.

## NOT done (all still to do)
1. Create the Notion internal integration `Momentum` (Read + Update content; no user info) at
   https://www.notion.so/profile/integrations; connect it to the "Daily Driver" page (child DBs inherit access);
   share any DB outside Daily Driver.
2. Live test: `cd momentum && NOTION_TOKEN=... MOMENTUM_PASSCODE=... SESSION_SECRET=... npm run dev:live`; sign in;
   `/api/state` must load habits, todos, weeklyGoals, goals, money, career with `errors` empty. Check Home, Habits,
   Goals, Money, Career against Notion numbers. Write-back test: tick `Hydrate 1.5L` for today in the app -> flips in
   Notion in seconds; tick in Notion -> app shows within ~8s; restore original state. Log a fitness session
   (Fitness -> Log) -> `Workout` ticks in Notion for that date; restore afterwards. Add tests in `momentum/test/`
   for anything fixed.
3. Tim (`/Users/ibinoola/Documents/Tim - Finance Bot`, deployed at tim-finance-bot.vercel.app): read how it stores
   budgets/spending/savings; add ONE read-only `GET /api/momentum` returning exactly the JSON contract in
   `momentum/SETUP.md` ("Tim (finance)"); bearer token compared in constant time, 401 without it. Commit in Tim's
   own repo for review. SHOW the owner and get confirmation BEFORE deploying Tim. Then set `TIM_URL`/`TIM_TOKEN` in
   Momentum's Vercel env and confirm the Money page shows spending vs budget (replacing "Connect Tim").
4. Deploy Momentum: Vercel project from this GitHub repo, **Root Directory = `momentum`**, Framework Preset = Other
   (NOT repo root, which is a different Next.js app). Env vars: `NOTION_TOKEN`, `MOMENTUM_PASSCODE` (ask the owner
   which passcode), `SESSION_SECRET` (generate a long random string), `MOMENTUM_TZ` if not `Africa/Lagos`,
   `TIM_URL`/`TIM_TOKEN` when ready. Re-run the step-2 checks on production; confirm `/sw.js` and the manifest are
   served, PWA installs at phone viewport, and unauthenticated `/api/state` returns 401.
5. Report: production URL, what was verified, anything fixed, anything still manual.

## Hard rules (unchanged)
- Never print, log or commit secrets (Notion token, Vercel token, passcode, Tim token): Vercel env vars or an
  untracked local `.env` only.
- Do NOT change the visual design (white/gray, near-black primary, Inter, soft blue for "now", green/amber/red only
  as status; the old neon-green Myntro look was rejected). Fix bugs only.
- Write-back ONLY to `Workout` and `Hydrate 1.5L` on Habits (`writableHabits` in `api/_lib/config.js`). Do not
  widen it. Never untick anything automatically.
- Anything changing production Tim must be shown to the owner and confirmed before deploy.

## Owner decisions already made
- Every logged fitness session counts as a workout (`Sync.tickOn('Workout', date)` in `momentum/js/main.js`).
- Passcode-only login; no Google sign-in.
- Notion is the source of truth; Momentum is read-only except the two habit checkboxes.
- Keep the cycle configurable (`CYCLE_START`, `CYCLE_END`, `CYCLE_LABEL`, `config.js`); no hard-coded week numbers.
  Current defaults: 2026-10-04 to 2026-12-31, label "Oct 4 - Dec 31".

## Suggested first prompt for the new session
"Read HANDOFF-momentum.md and momentum/SETUP.md, check out branch ccr-c049a876-k1jmlf, skip the schema check
(already done), and continue from task 1 using Chrome."
