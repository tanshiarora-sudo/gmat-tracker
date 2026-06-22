# Fakhir's GMAT Quest

A zero-build, offline GMAT Focus prep tracker. Apple-inspired light UI, all data stays in your browser (localStorage). Built on the same engine as the CAT 2026 tracker.

- **Exam:** 30 Aug 2026
- **Plan window:** 22 Jun – 22 Aug (syllabus + mocks wrapped by the 22nd, leaving 22–30 Aug for light revision)
- **Quant pool:** 450 questions across 18 topics (even default split of 25/topic, editable per topic)
- **Verbal (English):** Critical Reasoning 140 + Reading Comprehension 120 = 260
- **Data Insights (logical reasoning + data):** Data Sufficiency 110, Two-Part 55, Graphics Interpretation 45, Multi-Source 45, Table Analysis 45 = 300
- **Grand total ≈ 1010 questions.** Daily goal is `max(15, required-pace)` (~17–18/day) with a rollover that grows tomorrow's target if you fall short — so the syllabus finishes early and banks time for mocks + revision.
- **Mocks:** 8 full-length GMAT Focus mocks on a fixed plan (Diagnostic 29 Jun → Final 21 Aug), shown on the Mocks tab; each slot ticks off as you log one. 22–30 Aug = review + rest.

## Run it

No build step, no dependencies:

```bash
cd ~/Desktop/gmat-tracker
python3 -m http.server 4187
# open http://127.0.0.1:4187
```

or just double-click `index.html`.

## Tabs

- **Today** — a **Dragon boss widget** (its HP is your *un*-finished daily target: full health + evil fire-breathing at 0%, dying as you log, slain with X-eyes and "Fakhir won today" at 100%), countdown to exam + syllabus cutoff, today's target ring, and a session logger (pick topic → questions solved, correct, minutes). Shows the day's sessions, accuracy, time, and study streak.
- **Syllabus** — per-section collapsibles (Quant open by default). Each topic row shows progress, questions left, accuracy, required pace/day, and a projected finish from your last-14-day pace. Edit any topic's question total inline; add/delete topics per section.
- **Mocks** — log full-length GMAT Focus mocks (section scores 60–90, total 205–805) with a score trend chart and history table.
- **Dashboard** — overall readiness ring, on-track/behind-pace card, daily-questions chart (last 30 days), weakest topics by accuracy, mock-total trend, and a month heatmap of question volume.
- **Reports** — weekly report: this week vs last (questions, accuracy, active days, time), wins / areas to improve / next-week focus.

## Pace engine

- **Required pace** = remaining questions ÷ actionable days left to the 22 Aug cutoff (inclusive).
- **On track?** compares your last-7-day average against the required pace.
- **Accuracy** = correct ÷ attempted, per topic / section / overall (shown once a topic has logged questions).

## Data safety

- **Export / Import** JSON from the header any time.
- **Link Backup File** (Chrome/Edge): every change auto-writes to a file you pick on disk.
- **Rolling snapshots:** last 7 days of state kept under a separate key.
- **Reset** requires typing `DELETE` and auto-downloads a backup first.
- If no live backup is linked, a dated JSON auto-exports to Downloads every 3 days.

## Files

| File | Owns |
|---|---|
| `index.html` | shell + load order |
| `styles.css` | design tokens, light theme |
| `core.js` | state, persistence, dates, pace/scoring engine, topic seed |
| `charts.js` | dependency-free SVG rings, area/bar charts, radar |
| `backup.js` | on-disk backup + snapshots + auto-export |
| `app.js` | all five tabs, rendering and events |

## Notes & assumptions

- Built for the **GMAT Focus Edition** (Quantitative, Verbal, Data Insights). The 18 Quant topics map to your provided list.
- 450 Quant questions are seeded as 25 per topic; change any total in the Syllabus tab and the pace recomputes.
- Deleting a topic keeps its logged sessions in history but stops counting them toward progress.
- Mock total is entered directly (GMAT Focus totals are scaled, not a plain sum of section scores).
