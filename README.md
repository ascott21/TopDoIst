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

Todoist's P1-P4 flag, linearly mapped so P4 (no priority) is 0 and P1 is 1:

```
priorityScore = (todoistPriority - 1) / 3
```

(Todoist's API represents P1 as `4` and P4 as `1` internally, hence the
`- 1) / 3` to land on a clean 0-1 scale.) A P1 task scores a full 1.0 here;
a P4 task scores 0.

### Due date urgency

This is the only signal that can exceed 1, so overdue tasks can genuinely
dominate the ranking:

- **Overdue**: starts at 1.0 the moment it's overdue and climbs toward 2.0
  as more days pass — `1 + daysOverdue / 14`, capped at 2.0. So a task 14+
  days overdue is maxed out.
- **Due today or already past due-time**: flat 1.0.
- **Due within the next week**: falls off linearly from ~0.9 (due
  tomorrow) down to ~0.3 (due in 7 days).
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
`quick-win` adds 8. Add your own by editing `DEFAULT_LABEL_BONUSES` in
`src/lib/scoring.js`.

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

Each task's project (and section, if it's in one) shows in small type
under its title.

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
