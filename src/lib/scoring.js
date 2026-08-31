// Scoring engine for ranking Todoist tasks.
//
// Every task gets a composite score built from three independent signals:
//   - priority: Todoist's own P1-P4 flag, weighted so each tier is worth
//     twice the one below it
//   - urgency: how close (or overdue) the due date is, down to the hour —
//     due today outranks due tomorrow, and earlier in the day outranks
//     later in the day, because it's driven by precise time remaining
//     rather than whole-day buckets
//   - staleness: how long the task has sat untouched, so old tasks don't
//     get buried forever just because they lack a due date
// Label bonuses are added on top so you can hand-tag a "quick win" or
// "urgent" task to bump it in the list without changing its due date.
//
// Each contribution is normalized to roughly 0-1 before weighting, so the
// weights themselves (see DEFAULT_WEIGHTS) are meaningful dials rather than
// magic numbers tied to Todoist's internal scale.

import { dueInstant } from './dueDate'

export const DEFAULT_WEIGHTS = {
  priority: 1,
  due: 2,
  staleness: 0.5,
}

// label (lowercased) -> flat bonus added to the final 0-100 score
export const DEFAULT_LABEL_BONUSES = {
  urgent: 15,
  'quick-win': 8,
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_HOUR = 1000 * 60 * 60
const HOURS_PER_DAY = 24
const WEEK_HOURS = HOURS_PER_DAY * 7

function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / MS_PER_DAY
}

// Todoist REST API priority is 1 (normal / P4) .. 4 (urgent / P1). Each
// tier is worth double the one below it (P4=1, P3=2, P2=4, P1=8),
// normalized against the top so P1 still maxes out at 1.0 — same ceiling
// as before, just a different curve between the tiers. P4 no longer
// contributes exactly zero, since "zero" isn't expressible in a pure
// doubling ratio; it now contributes a small nonzero share (1/8th of P1's).
function priorityScore(task) {
  const p = task.priority ?? 1
  const rank = p - 1 // 0 for P4 ... 3 for P1
  return Math.pow(2, rank) / 8
}

// Returns a value roughly in [0, 2]. Overdue tasks climb above 1 the longer
// they've been overdue (capped at 2, reached after ~14 days); not-yet-due
// tasks decay from 1.0 (due right now) down to 0.3 (due in exactly 7 days)
// along one continuous line, then keep decaying slowly beyond that, floored
// at 0.1. Tasks with no due date get a low flat baseline so staleness is
// what surfaces them instead.
//
// Driven by precise hours until due (not whole-day buckets), using
// Todoist's actual due time when it has one, or end-of-day when it
// doesn't (see dueInstant) — so a task due today always outranks one due
// tomorrow, and earlier-in-the-day outranks later-in-the-day, at any
// distance out.
function dueScore(task, now) {
  const due = dueInstant(task.due)
  if (!due) return 0.15

  const hoursUntilDue = (due.getTime() - now.getTime()) / MS_PER_HOUR

  if (hoursUntilDue < 0) {
    const hoursOverdue = -hoursUntilDue
    return Math.min(1 + hoursOverdue / (14 * HOURS_PER_DAY), 2)
  }
  if (hoursUntilDue <= WEEK_HOURS) {
    return 1 - (hoursUntilDue / WEEK_HOURS) * 0.7
  }
  // further out: keep decaying slowly, floor at 0.1
  const daysOut = hoursUntilDue / HOURS_PER_DAY
  return Math.max(0.3 - (daysOut - 7) * 0.01, 0.1)
}

// Returns a value in [0, 1] that grows with the task's age, capped at 30
// days. Purely additive nudge for tasks that have no due date and would
// otherwise never bubble up.
//
// The creation-date field name has moved around across Todoist API
// versions (created_at / date_added / added_at), so check all of them
// rather than assuming one.
function stalenessScore(task, now) {
  const createdRaw = task.created_at ?? task.date_added ?? task.added_at
  if (!createdRaw) return 0
  const created = new Date(createdRaw)
  if (Number.isNaN(created.getTime())) return 0
  const days = Math.max(daysBetween(created, now), 0)
  return Math.min(days / 30, 1)
}

function labelBonus(task, labelBonuses) {
  if (!task.labels?.length) return 0
  return task.labels.reduce((sum, label) => {
    const key = label.toLowerCase()
    return sum + (labelBonuses[key] ?? 0)
  }, 0)
}

// Scores a single task. Returns { total, breakdown } where breakdown shows
// each component's raw and weighted contribution, useful for a tooltip.
export function scoreTask(task, { weights = DEFAULT_WEIGHTS, labelBonuses = DEFAULT_LABEL_BONUSES, now = new Date() } = {}) {
  const priority = priorityScore(task)
  const due = dueScore(task, now)
  const staleness = stalenessScore(task, now)
  const labels = labelBonus(task, labelBonuses)

  // Weighted signals scaled to a 0-100-ish range, plus flat label bonuses.
  const weighted = {
    priority: priority * weights.priority * 20,
    due: due * weights.due * 20,
    staleness: staleness * weights.staleness * 20,
    labels,
  }

  const total = weighted.priority + weighted.due + weighted.staleness + weighted.labels

  return {
    total: Math.round(total * 10) / 10,
    breakdown: {
      priority: { raw: priority, weighted: Math.round(weighted.priority * 10) / 10 },
      due: { raw: due, weighted: Math.round(weighted.due * 10) / 10 },
      staleness: { raw: staleness, weighted: Math.round(weighted.staleness * 10) / 10 },
      labels: { weighted: Math.round(weighted.labels * 10) / 10 },
    },
  }
}

// Scores and sorts a list of tasks, highest score first.
export function rankTasks(tasks, options = {}) {
  return tasks
    .map((task) => ({ task, ...scoreTask(task, options) }))
    .sort((a, b) => b.total - a.total)
}
