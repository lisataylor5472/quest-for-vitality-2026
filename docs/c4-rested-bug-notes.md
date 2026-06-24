# C4 Rested Calculation Bug — Debug Notes

## What the bug looked like
Rested % maxed out at ~50% for all players. The "Rested" column was silently falling back to the raw `dgnProgress` value from the `cmpgn4` backend data, which is capped at 50 server-side.

## Data that pinpointed it

**API response — c4 campaign object:**
```json
{
  "id": "c4",
  "start": "2026-06-14T06:00:00.000Z",
  "end":   "2026-07-11T06:00:00.000Z",
  "days":  28
}
```

`start` and `end` are full ISO datetime strings (with time + timezone), not bare `YYYY-MM-DD` dates.

**The broken code:**
```js
const cursor = new Date(c.start + 'T00:00:00Z')
// → new Date("2026-06-14T06:00:00.000ZT00:00:00Z") → Invalid Date
```

Because `c.start` already contained a time component, appending `T00:00:00Z` produced an unparseable string. `cursor` was `Invalid Date`, the while loop never ran, `elapsed` was `[]`, and the function returned an empty Map early.

With an empty Map, `rested` was `undefined` for every player, so `base.dgnProgress` was never overwritten — leaving the raw backend value (≤50) visible in the UI.

## Key data facts
- Campaign runs June 14 – July 11, 2026 (28 days)
- `currentDate` from gameState: `2026-06-24T06:00:00.000Z` → day 11 of the campaign
- `plyrActivity4` exists and has 148 entries (WebFetch truncated the response and missed it; `curl | python3` was needed to confirm)
- Activity `activeDay` values are also full ISO strings — `.slice(0, 10)` in `activitySetByPlayer` was already handling this correctly

## Fix summary
- Extract date-only with `.slice(0, 10)` before constructing `Date` objects
- Cap denominator at `min(today, c.end)` to stop counting after campaign ends
- Use `actSet.size` as numerator (all unique logged days) instead of intersecting with the elapsed window
