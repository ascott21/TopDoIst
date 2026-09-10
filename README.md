# TopDoist

A small dashboard that scores and ranks your Todoist tasks so you can see
what to work on next.

It's read-mostly by design: it fetches your active tasks, computes a score
for each one, and shows them ranked. It never writes priorities, due dates,
or content back to Todoist. Two things it does write: checking a task off
directly from here (see below), and applying/removing the "Up Next" label
when you drag a task in or out of that section (see [Up Next](#up-next)) —
both because that's the point of using the app for anything beyond looking.

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
line it up manually instead.

Dragging a task in (or hitting Remove) actually applies (or removes) an
**"Up Next" label** on the task in Todoist — this is the one place besides
marking a task complete where the app writes back. That means which tasks
are in Up Next is the same everywhere you sign in, not just this browser:
label a task from your phone's Todoist app directly and it'll show up
here too.

Manual **order** within Up Next is different — Todoist has no concept of a
custom order within a label, so drag-to-reorder stays local to this
browser (persisted, but not synced) and never touches the network. A task
that's in Up Next because of its label but has no saved position here yet
(e.g. it was labeled on another device) gets appended in score order until
you drag it somewhere specific.

On a mouse or trackpad, click-drag anywhere on the row. On touch, the drag
zone is deliberately confined to the small leading circle instead of the
whole row — otherwise your finger swiping down the middle of a task to
scroll the page would get mistaken for a drag. That circle doubles as a
"mark complete" checkbox on both: a plain tap/click checks the task off in
Todoist and removes it from the list; a press-and-hold-then-move picks it
up to drag. The brief hold before a drag starts is what lets a tap still
reach the checkbox instead of always starting a drag.

## Live updates

The app quietly re-fetches from Todoist every 15 seconds, so a task added
or changed elsewhere — the Todoist app on your phone, say — shows up here
on its own, no manual Refresh needed. A few things keep this cheap and
out of your way:

- It's paused whenever the tab isn't visible, and catches up immediately
  the moment you switch back rather than waiting out the rest of the
  interval.
- It's paused while a drag, a completion, or an Up Next label write is in
  progress, so a poll landing mid-action can't step on it.
- A failed background poll fails quietly rather than flashing an error —
  the manual Refresh button (and its own error handling) is still there
  if something's actually wrong.

15 seconds was chosen with real margin against Todoist's rate limits in
mind (sources put the limit somewhere around several hundred to a
thousand requests per 15 minutes per token — at this interval a full
refresh's ~5 requests works out to roughly 225–300 requests per 15
minutes), including room for having the app open in more than one tab or
device at once, which multiplies the request rate since each polls
independently.

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
under its title. A small document icon there means the task has a
description; a speech-bubble icon means it has comments — no counts, just
a nudge that there's more worth a look before you start it. The
description icon is always current (it comes free with every task); the
comments icon is refreshed only on a full load or manual Refresh, not on
every 15-second background poll — see [Live updates](#live-updates) for
why (Todoist's task data doesn't include a comment count, so checking
means one extra request per project, too much to do every 15 seconds).

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

## Branding

The app icon lives at `public/icon.svg` — Vite copies anything in
`public/` to the build output root as-is, so it's referenced from both
`index.html` (the favicon) and the header logo in `src/App.jsx` by the
same root-relative path, `/icon.svg`. It's a plain SVG reconstruction of
a design made in Claude Design (three stacked bars, widest-to-narrowest,
in a rounded badge) — vector rather than a fixed-resolution export, so it
stays crisp at both favicon and logo size. There's also a dark-background
variant of the same design that isn't wired in anywhere currently; swap
`public/icon.svg` for it (or add it alongside and reference it from a
`prefers-color-scheme` media query in `index.html`) if the light version
ever stops being the right call for the tab-bar/OS chrome it was chosen
for.
