# TopDoist

A small dashboard that scores and ranks your Todoist tasks so you can see
what to work on next, without changing anything in Todoist itself.

It's read-only by design: it fetches your active tasks, computes a score for
each one, and shows them ranked — it never writes priorities back to
Todoist.

## How scoring works

Each task's score is a weighted combination of three signals:

- **Priority** — Todoist's own P1-P4 flag.
- **Due date urgency** — overdue tasks score highest (climbing the longer
  they've been overdue), due-today is high, and the score decays the
  further out a due date is. Tasks with no due date get a small flat
  baseline.
- **Staleness** — how long ago the task was created, so old undated tasks
  don't get buried forever.

On top of that, labels can add a flat bonus — `urgent` and `quick-win` are
pre-configured — so you can hand-tag something to bump it up regardless of
its due date.

Drag any task into the **Up Next** section to pull it out of the ranking
and line it up manually instead — order there is up to you (drag to
reorder), and it persists across reloads.

## Settings

The gear icon opens a settings panel with:

- **Shared project tasks** — how to handle tasks in projects you share with
  other people: include everyone's, include only unassigned tasks plus
  your own, or only tasks assigned to you. This has no effect on tasks in
  your own (non-shared) projects — those always show.
- **Project** — filter the list down to a single project.
- **Weights** — the three scoring sliders described above. Changes re-rank
  instantly using the tasks already loaded (no need to refetch). See
  `src/lib/scoring.js` for the exact formula.

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
