# Family Whispers — born-stage content

Content is plain JSON, one file per stage per theme, so it can be written,
edited or translated without touching application code. `index.js` is the only
thing that reaches these files; everything else goes through the store.

This is the **born-stage** content. Pregnancy is a different track with a
different shape — see `src/data/pregnancy/README.md`.

## Two tracks, and why

| Track  | Address                                       | Repeats |
| ------ | --------------------------------------------- | ------- |
| `womb` | day of pregnancy 1..280, over 9 uneven months | never   |
| `year` | calendar month 1..12, plus day of that month  | yearly  |

The womb has an end, so its content sits on a line. A child does not — they are
in School Years for seven years — so born-stage content is addressed by where
the _calendar_ is. One evergreen theme per month, cycling every year.

## The twelve themes

Fixed, in `themes.js`, and the same twelve for every stage. Only the wording
changes with the stage. March is Wisdom & Discernment for a seven-year-old and
for a fifteen-year-old, so a family prays one theme over the whole house.

| #   | Theme                        | #   | Theme                  |
| --- | ---------------------------- | --- | ---------------------- |
| 1   | Identity & Belonging         | 7   | Joy & Gratitude        |
| 2   | Love & Healthy Relationships | 8   | Character & Integrity  |
| 3   | Wisdom & Discernment         | 9   | Resilience & Hope      |
| 4   | Courage & Strength           | 10  | Generosity & Legacy    |
| 5   | Purpose & Calling            | 11  | Peace & Rest           |
| 6   | Protection & Covering        | 12  | Renewal & Fresh Vision |

## The stages

`womb`, `infant`, `toddler`, `school`, `teen`, `youngAdult`, `adult` — defined
with their age ranges in `stages.js`. Everything except `womb` reads this
content.

## File shape

`stages/<stage>/<NN>-<theme-slug>.json`, for example
`stages/school/01-identity-and-belonging.json`:

```jsonc
{
  "stage": "school", // must match the directory
  "month": 1, // 1..12, must match the file's number
  "slug": "identity-and-belonging", // must match the theme's slug
  "title": "Identity & Belonging",
  "intro": "2-3 sentences introducing the theme for this stage.",
  "keyScriptures": [{ "ref": "Psalm 139:13-14", "text": "..." }], // 1 or 2
  "palette": "dawn", // see src/data/pregnancy/palettes.js

  "weeks": [
    {
      "week": 1, // 1..4
      "title": "You Are Known",
      "declaration": "The week's declaration, 2-4 sentences.",
      "parentsPrayer": "A short closing prayer for the parents."
    }
  ],

  "days": [
    {
      "day": 1, // day of the month, 1..31
      "title": "Known by Name",
      "declaration": "2-3 short sentences, spoken over the child.",
      "scripture": { "ref": "Isaiah 43:1", "text": "..." }
    }
  ]
}
```

### Days

Write **31**. Days 1–28 are required, because February must be covered; 29–31 are
optional but a month missing them shows a placeholder on the 29th of a long
month, which is a strange thing for a user to hit. The validator enforces 1–28
and warns about nothing else.

### Weeks

Exactly **four**. Days 1–7 are week 1, 8–14 week 2, 15–21 week 3, and everything
from 22 to the end of the month is week 4. The last one is 7–10 days long, which
is the honest way to put four cards on a month rather than inventing a fifth
that most months would not fill.

## Voice

Warm, biblical, affirmative, non-clinical. Speakable — these are read aloud over
a child, so short sentences and plain words beat clever ones.

**Write in the second person, with no vocative.** "You are known by name," not
"Little one, you are known by name." The pregnancy content uses `Little one` as
an address that the app swaps for a chosen name; that is wrong over a
fifteen-year-old, and content that opens with a name reads badly for the many
users who never set one. A test asserts no born-stage declaration contains
`Little one`.

Match the stage. School Years answers "am I any good, and do I belong here" as a
child hears it — marks, teams, who sat with them at lunch. Teen Years answers a
harder version asked in public — image, comparison, approval. Same theme, same
Scriptures where they fit, different weight.

## Adding a stage or a theme

1. Write the JSON file into `stages/<stage>/`, named `<NN>-<theme-slug>.json`.
2. Run `npx vitest run tests/unit/familyContent.spec.js`.

There is no step where you edit `index.js`. It picks files up with
`import.meta.glob`, so the filename is the registration — which also means a
file in the wrong directory or with the wrong number silently becomes a
different month, and the validator is what catches that.

**Content is loaded one stage at a time, on demand.** A finished stage is 372
daily declarations; six of them imported statically would be downloaded by every
visitor before first paint, including the five stages they have no child in. So
each stage is its own lazy chunk, fetched when a profile in that stage is first
opened. Lookups stay synchronous and answer `null` until it arrives — the same
answer they give for a stage nobody has written, so the UI needs no extra state.

`validate()` runs when a stage is loaded and throws on a file whose month, stage
or slug disagree with where it sits, a repeated or out-of-range day, a missing
day in 1–28, or a missing week. A content edit that breaks the shape fails the
test rather than showing a user the wrong declaration for the rest of the month.

## What is written

| Stage                              | Themes written      | Daily | Weekly |
| ---------------------------------- | ------------------- | ----- | ------ |
| school                             | 12 of 12 — complete | 372   | 48     |
| teen                               | 12 of 12 — complete | 372   | 48     |
| infant, toddler, youngAdult, adult | none yet            | —     | —      |

Within a stage, **every day title and every declaration is unique across the
whole year**, and the tests assert it. Titles are what the month grid, the Saved
list and the share card display, so a repeat eleven months later reads as a bug
rather than as a refrain.

A stage or theme with nothing written is a normal answer of `null`, not an
error: the app shows a gentle "being written" card and everything a parent has
already saved for that child is kept.
