# Birth Calendar — content data model

Content is plain JSON, one file per pregnancy month, so it can be edited or
translated without touching application code. `index.js` is the only thing that
imports these files; everything else goes through the store.

## The timeline

The canonical unit is the **day of pregnancy**, `1..280`, counted from the last
menstrual period (LMP). This is the same convention every midwife and pregnancy
app uses, so "you are 24 weeks" here means what it means everywhere else.

    LMP  = dueDate - 280 days
    day  = daysBetween(LMP, today) + 1        // 1-based
    week = ceil(day / 7)                      // gestational week, 1..40

Nine months are mapped onto forty weeks. They are NOT all the same length —
40 does not divide by 9 — so months carry an explicit day range and the code
never assumes otherwise:

| Month | Weeks | Days    | Length |
|-------|-------|---------|--------|
| 1     | 1–4   | 1–28    | 28     |
| 2     | 5–8   | 29–56   | 28     |
| 3     | 9–13  | 57–91   | 35     |
| 4     | 14–17 | 92–119  | 28     |
| 5     | 18–22 | 120–154 | 35     |
| 6     | 23–26 | 155–182 | 28     |
| 7     | 27–30 | 183–210 | 28     |
| 8     | 31–35 | 211–245 | 35     |
| 9     | 36–40 | 246–280 | 35     |

The ranges sum to exactly 280. `index.js` asserts this at load time, so a badly
edited content file fails loudly instead of quietly losing a day.

## Month file shape

```jsonc
{
  "month": 1,                     // 1..9
  "slug": "known-and-chosen",
  "title": "Known & Chosen",
  "intro": "2-3 sentences.",
  "keyScripture": { "ref": "Jeremiah 1:5", "text": "..." },
  "palette": "dawn",              // see src/data/pregnancy/palettes.js
  "startDay": 1, "endDay": 28,
  "startWeek": 1, "endWeek": 4,

  "weeks": [
    {
      "week": 1,                  // gestational week number, not 1..4
      "title": "Known Before You Were Formed",
      "declaration": "...",
      "parentsPrayer": "Closing prayer for the parents this week."
    }
  ],

  "days": [
    {
      "day": 1,                   // global day of pregnancy, 1..280
      "title": "Known Before Time",
      "declaration": "2-4 sentences, spoken over the baby.",
      "partner": "Optional rephrase for the partner voice. Falls back to
                  `declaration` when absent.",
      "scripture": { "ref": "Psalm 139:1", "text": "..." }
    }
  ]
}
```

`day` is global (1..280), not per-month. That means a day entry is meaningful on
its own — no month context needed to place it — and the lookup is a flat map.

## Editing the content

All nine months are written: 280 daily entries and 40 weekly entries. The store,
views, favourites, journal and progress are driven by the ranges above, not by
whether a given day has content, so a day left empty renders a gentle
"content coming soon" card rather than breaking — useful while drafting a
rewrite or a translation.

`tests/unit/pregnancyContent.spec.js` asserts full coverage: every day 1..280 is
written exactly once, every entry has a title, declaration and Scripture, every
week has a parents' prayer, and no month repeats a day title. Run it after any
content edit.
