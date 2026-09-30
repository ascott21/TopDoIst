// Scoring engine for ranking Todoist tasks. The full formula is walked
// through in the README's "How scoring works" section.
//
// Each task's score combines three signals, each normalized to roughly 0-1
// so the weights are meaningful dials rather than numbers tied to Todoist's
// internal scales:
//   - priority: Todoist's P1-P4 flag
//   - due: how close (or overdue) the due date is, to the hour
//   - staleness: how long ago the task was created
// Label bonuses are then added on top as flat points.

import { MS_PER_DAY, MS_PER_HOUR, dueInstant } from './dueDate'

export const DEFAULT_WEIGHTS = {
  priority: 1,
  due: 2,
  staleness: 0,
}

// Lowercased label -> flat points added to the final score.
export const DEFAULT_LABEL_BONUSES = {
  long: 5,
}

// Each weighted signal is scaled by this, so a signal at 1.0 with weight 1
// contributes 20 points.
const POINTS_PER_WEIGHT = 20

const HOURS_PER_WEEK = 24 * 7
const OVERDUE_HOURS_TO_MAX = 24 * 14
const STALENESS_DAYS_TO_MAX = 30

// Todoist's API priority runs 1 (P4) to 4 (P1). Each tier is worth double
// the one below: P4 = 0.125, P3 = 0.25, P2 = 0.5, P1 = 1.
function priorityScore(task) {
  const rank = (task.priority ?? 1) - 1
  return 2 ** rank / 8
}

// Roughly 0-2, and the only signal that can pass 1, so overdue tasks can
// dominate the ranking:
//   - overdue: 1.0 rising to 2.0 at 14 days overdue
//   - due within a week: 1.0 (due now) falling linearly to 0.3 (due in 7 days)
//   - further out: keeps falling 0.01 a day, floored at 0.1
//   - no due date: 0
function dueScore(task, now) {
  const due = dueInstant(task.due)
  if (!due) return 0

  const hoursUntilDue = (due.getTime() - now.getTime()) / MS_PER_HOUR
  if (hoursUntilDue < 0) {
    return Math.min(1 - hoursUntilDue / OVERDUE_HOURS_TO_MAX, 2)
  }
  if (hoursUntilDue <= HOURS_PER_WEEK) {
    return 1 - (hoursUntilDue / HOURS_PER_WEEK) * 0.7
  }
  const daysPastAWeek = (hoursUntilDue - HOURS_PER_WEEK) / 24
  return Math.max(0.3 - daysPastAWeek * 0.01, 0.1)
}

// 0-1, reaching 1 once a task is 30 days old. The creation-date field has
// had different names across Todoist API versions, so all are checked.
function stalenessScore(task, now) {
  const createdRaw = task.created_at ?? task.date_added ?? task.added_at
  if (!createdRaw) return 0
  const created = new Date(createdRaw)
  if (Number.isNaN(created.getTime())) return 0
  const daysOld = Math.max((now.getTime() - created.getTime()) / MS_PER_DAY, 0)
  return Math.min(daysOld / STALENESS_DAYS_TO_MAX, 1)
}

// Object.hasOwn rather than a plain lookup, so a label named like a
// built-in object property ("constructor", "toString") isn't read as one.
function labelBonus(task, labelBonuses) {
  if (!task.labels?.length) return 0
  return task.labels.reduce((sum, label) => {
    const key = label.toLowerCase()
    return sum + (Object.hasOwn(labelBonuses, key) ? labelBonuses[key] : 0)
  }, 0)
}

function roundToTenth(n) {
  return Math.round(n * 10) / 10
}

// Returns { total, breakdown }, where breakdown holds each signal's raw value
// and weighted points, for the ranked table's tooltip.
export function scoreTask(task, { weights = DEFAULT_WEIGHTS, labelBonuses = DEFAULT_LABEL_BONUSES, now = new Date() } = {}) {
  const raw = {
    priority: priorityScore(task),
    due: dueScore(task, now),
    staleness: stalenessScore(task, now),
  }
  const points = {
    priority: raw.priority * weights.priority * POINTS_PER_WEIGHT,
    due: raw.due * weights.due * POINTS_PER_WEIGHT,
    staleness: raw.staleness * weights.staleness * POINTS_PER_WEIGHT,
    labels: labelBonus(task, labelBonuses),
  }

  return {
    total: roundToTenth(points.priority + points.due + points.staleness + points.labels),
    breakdown: {
      priority: { raw: raw.priority, weighted: roundToTenth(points.priority) },
      due: { raw: raw.due, weighted: roundToTenth(points.due) },
      staleness: { raw: raw.staleness, weighted: roundToTenth(points.staleness) },
      labels: { weighted: roundToTenth(points.labels) },
    },
  }
}

// Scores and sorts tasks, highest first. `now` is fixed once for the whole
// list so every task is scored against the same moment.
export function rankTasks(tasks, { now = new Date(), ...options } = {}) {
  return tasks
    .map((task) => ({ task, ...scoreTask(task, { ...options, now }) }))
    .sort((a, b) => b.total - a.total)
}
