# TopDoist

A small dashboard that scores and ranks your Todoist tasks so you can see
what to work on next.

It's read-mostly by design: it fetches your active tasks, computes a score
for each one, and shows them ranked. It never writes priorities, due dates,
or anything else back to Todoist — the one exception is checking a task off
directly from here (see below), since that's the whole point of getting
through the list.

## How scoring works

Each task's score is a weighted combination of three signals, each first
normalized to its own small range and then scaled by its weight × 20. With
the default weights (priority 1, due 2, staleness 0.5), each signal can
contribute up to roughly 20, 40, and 10 points respectively, plus whatever
label bonuses apply. The exact formula lives in `src/lib/scoring.js`; this
just walks through it.

### Priority

Todoist's P1-P4 flag, weighted so each tier is worth double the one below
it (P4=1, P3=2, P2=4, P1=8), normalized against the top so P1 still maxes
out at 1.0:

```
priorityScore = 2^(todoistPriority - 1) / 8
```

(Todoist's API represents P1 as `4` and P4 as `1` internally, hence the
`- 1` to get a 0-indexed rank first.) That gives P4=0.125, P3=0.25, P2=0.5,
P1=1.0 — P4 no longer scores exactly zero, since "zero" isn't expressible
in a pure doubling ratio, but it's a small share (1/8th of P1's).

### Due date urgency

This is the only signal that can exceed 1, so overdue tasks can genuinely
dominate the ranking. It's driven by precise **hours** until due — using
the task's actual due time when it has one, or 23:59:59 local time on the
due date when it doesn't — not by which whole day it falls on. That's what
makes "due today" reliably outscore "due tomorrow," and an earlier time
outscore a later time on the same day, at any distance out:

- **Overdue**: starts at 1.0 the moment it's overdue and climbs toward 2.0
  as more hours pass — `1 + hoursOverdue / (14 × 24)`, capped at 2.0. So a
  task 14+ days overdue is maxed out.
- **Due within the next week**: one continuous line from 1.0 (due right
  now) down to 0.3 (due in exactly 7 days) — so, for example, something
  due in 6 hours scores higher than something due in 30 hours, which
  scores higher than something due in 50 hours, and so on continuously
  rather than in whole-day steps.
- **Due more than a week out**: keeps decaying slowly, floored at 0.1 so it
  never hits zero.
- **No due date at all**: a flat 0.15 — low, so it won't compete with
  anything that has a real deadline, but not zero either.

### Staleness

How long ago the task was created, so an old task with no due date doesn't
sit buried forever just because it never got scored on urgency:

```
stalenessScore = min(daysSinceCreated / 30, 1)
```

It grows linearly and caps out at 1.0 once a task is 30+ days old. A
brand-new task contributes essentially nothing here; a month-old (or older)
one contributes its full share.

### Label bonuses

Unlike the three signals above, label bonuses are a flat addition to the
final score rather than a normalized/weighted component — they don't scale
with the weight sliders. Two are pre-configured: `urgent` adds 15 points,
`quick-win` adds 8. Fully editable from Settings (see below) — add your
own, change the points on these two, or remove them entirely.

### Putting it together

```
total = (priorityScore  × priorityWeight  × 20)
      + (dueScore       × dueWeight       × 20)
      + (stalenessScore × stalenessWeight × 20)
      + labelBonuses
```

Hovering a row in the task table shows a tooltip with that task's actual
per-component numbers, so you can see exactly why it landed where it did.

## Up Next

Drag a task into the **Up Next** section to pull it out of the ranking and
line it up manually instead. Order there is up to you — drag to reorder
within the list — and it persists across reloads.

On a mouse or trackpad, click-drag anywhere on the row. On touch, the drag
zone is deliberately confined to the small leading circle instead of the
whole row — otherwise your finger swiping down the middle of a task to
scroll the page would get mistaken for a drag. That circle doubles as a
"mark complete" checkbox on both: a plain tap/click checks the task off in
Todoist and removes it from the list; a press-and-hold-then-move picks it
up to drag. The brief hold before a drag starts is what lets a tap still
reach the checkbox instead of always starting a drag.

## Settings

The gear icon opens a settings panel with:

- **Shared project tasks** — how to handle tasks in projects you share with
  other people: include everyone's, include only unassigned tasks plus
  your own, or only tasks assigned to you. This has no effect on tasks in
  your own (non-shared) projects — those always show.
- **Project** — a checklist to show only the projects you check; there's
  an "All projects" master checkbox too.
- **Weights** — sliders for the three scoring signals described above.
  Changes re-rank instantly using the tasks already loaded (no need to
  refetch).
- **Label bonuses** — add, edit, or remove which labels affect a task's
  score and by how much. Type a label name (your own Todoist labels are
  offered as suggestions) and a point value, then Add; existing ones are
  editable in place, or removable. Points can be negative, to push tasks
  with that label down instead of up. "Reset to defaults" brings back just
  `urgent`/`quick-win`.

Each task's project (and section, if it's in one) shows in small type
under its title.

The Due column reads relative to today ("Today," "Tomorrow," "in 3 days,"
"3 days ago") within a week either direction, and a calendar date beyond
that — see [How scoring works](#how-scoring-works) for the exact
breakpoints. When a task has an actual time set (not just a date), it's
appended, e.g. "Today at 3:00 PM" — never fabricated for a task that's only
due on a date.

## Setup

```bash
npm install
npm run dev
```

On first load, paste in a Todoist API token (Todoist → Settings →
Integrations → Developer). The token is stored only in your browser's
`localStorage` and used to call Todoist's unified API v1 directly — it
never passes through any server of ours.

## Deploying

This is a static Vite app — deploy the `dist/` output anywhere static
(Vercel config is included). Since the Todoist token lives client-side,
there's no backend or environment variable to configure.
