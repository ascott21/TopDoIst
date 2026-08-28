// Scoring engine for ranking Todoist tasks.
//
// Every task gets a composite score built from three independent signals:
//   - priority: Todoist's own P1-P4 flag
//   - urgency: how close (or overdue) the due date is
//   - staleness: how long the task has sat untouched, so old tasks don't
//     get buried forever just because they lack a due date
// Label bonuses are added on top so you can hand-tag a "quick win" or
// "urgent" task to bump it in the list without changing its due date.
//
// Each contribution is normalized to roughly 0-1 before weighting, so the
// weights themselves (see DEFAULT_WEIGHTS) are meaningful dials rather than
// magic numbers tied to Todoist's internal scale.

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

// Todoist REST API priority is 1 (normal / P4) .. 4 (urgent / P1).
// Normalize so p1 -> 1, p4 -> 0.
function priorityScore(task) {
  const p = task.priority ?? 1
  return (p - 1) / 3
}

function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / MS_PER_DAY
}

// Returns a value roughly in [0, 2]. Overdue tasks climb above 1 the longer
// they've been overdue (capped at 2); tasks due today sit at 1; tasks due
// further out decay toward a small floor; tasks with no due date get a low
// flat baseline so staleness is what surfaces them instead.
function dueScore(task, now) {
  const due = task.due?.date ? new Date(task.due.date) : null
  if (!due) return 0.15

  const daysUntilDue = daysBetween(now, due)

  if (daysUntilDue < 0) {
    const daysOverdue = -daysUntilDue
    return Math.min(1 + daysOverdue / 14, 2)
  }
  if (daysUntilDue < 1) return 1
  if (daysUntilDue <= 7) {
    // linear falloff from ~0.9 (due tomorrow) to ~0.3 (due in a week)
    return 0.9 - (daysUntilDue - 1) * ((0.9 - 0.3) / 6)
  }
  // further out: keep decaying slowly, floor at 0.1
  return Math.max(0.3 - (daysUntilDue - 7) * 0.01, 0.1)
}

// Returns a value in [0, 1] that grows with the task's age, capped at 30
// days. Purely additive nudge for tasks that have no due date and would
// otherwise never bubble up.
function stalenessScore(task, now) {
  if (!task.created_at) return 0
  const created = new Date(task.created_at)
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
