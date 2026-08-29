import { useDraggable } from '@dnd-kit/core'
import PriorityDot from './PriorityDot'
import CompleteCheckbox from './CompleteCheckbox'
import { taskUrl, formatProjectMeta } from '../lib/taskDisplay'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Whole-day difference between a due date and today (positive = future).
function daysFromToday(date) {
  return Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / MS_PER_DAY)
}

// Always show the concrete due date, never Todoist's recurrence text (e.g.
// "every year") — the user just wants to see when it's next due, not that
// it repeats. Anything within a week either direction reads as relative
// ("in 3 days" / "3 days ago") rather than a calendar date.
function formatDue(due) {
  if (!due?.date) return '—'
  const date = new Date(due.date)
  if (Number.isNaN(date.getTime())) return due.date

  const diff = daysFromToday(date)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff <= 7) return `in ${diff} days`
  if (diff < -1 && diff >= -7) return `${-diff} days ago`
  return DATE_FORMATTER.format(date)
}

function isOverdue(due) {
  if (!due?.date) return false
  const date = new Date(due.date)
  if (Number.isNaN(date.getTime())) return false
  return daysFromToday(date) < 0
}

function TaskRow({ task, breakdown, projectsById, sectionsById, isCompleting, onComplete }) {
  // Deliberately not sortable — this list is algorithmically ranked, not
  // manually reorderable. Dragging one out just needs a source; where it's
  // dropped (Up Next) is what makes it sortable.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  const title = [
    `priority: ${breakdown.priority.weighted}`,
    `due: ${breakdown.due.weighted}`,
    `staleness: ${breakdown.staleness.weighted}`,
    `labels: ${breakdown.labels.weighted}`,
  ].join('\n')

  return (
    <tr ref={setNodeRef} className={isDragging ? 'is-dragging' : undefined} title={title}>
      <td className="col-check">
        <CompleteCheckbox checked={isCompleting} onComplete={() => onComplete(task.id)} dragProps={{ ...attributes, ...listeners }} />
      </td>
      <td className="col-task">
        <a href={taskUrl(task)} target="_blank" rel="noreferrer">
          {task.content}
        </a>
        {task.labels?.length > 0 && (
          <span className="labels">
            {task.labels.map((l) => (
              <span key={l} className="label-chip">
                {l}
              </span>
            ))}
          </span>
        )}
        <div className="task-meta">
          <PriorityDot priority={task.priority} />
          <span className="task-meta-project">{formatProjectMeta(task, projectsById, sectionsById)}</span>
        </div>
      </td>
      <td className={isOverdue(task.due) ? 'due-overdue' : undefined}>{formatDue(task.due)}</td>
    </tr>
  )
}

export default function TaskTable({ ranked, projectsById, sectionsById, completingIds, onComplete }) {
  if (ranked.length === 0) {
    return <p className="empty">No tasks left in the list — everything's either done or in Up Next.</p>
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th className="col-check" aria-hidden="true"></th>
          <th className="col-task">Task</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ task, breakdown }) => (
          <TaskRow
            key={task.id}
            task={task}
            breakdown={breakdown}
            projectsById={projectsById}
            sectionsById={sectionsById}
            isCompleting={completingIds.has(task.id)}
            onComplete={onComplete}
          />
        ))}
      </tbody>
    </table>
  )
}
