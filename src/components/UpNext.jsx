import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CompleteCheckbox from './CompleteCheckbox'
import PriorityDot from './PriorityDot'
import TaskIndicators from './TaskIndicators'
import DurationChip from './DurationChip'
import { effectiveDurationMinutes, formatMinutes } from '../lib/duration'
import { taskUrl, formatProjectMeta, formatDue, isOverdue } from '../lib/taskDisplay'

// The whole Up Next section is one droppable zone. It's what decides
// whether a drop lands in Up Next at all (see upNextCollisionDetection in
// App.jsx), and it's the drop target itself while the list is empty and
// there are no items to drop next to.
export const UP_NEXT_DROPPABLE_ID = 'up-next'

function UpNextItem({ task, projectsById, sectionsById, isCompleting, onComplete, onRemove, hasComments, openInDesktopApp }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const dragProps = { ...attributes, ...listeners }
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`up-next-item row-draggable${isDragging ? ' is-dragging' : ''}`}
      // Same as the ranked table: the whole item is the drag source.
      {...dragProps}
    >
      <CompleteCheckbox checked={isCompleting} onComplete={() => onComplete(task.id)} />
      <span className="up-next-content">
        <a href={taskUrl(task, { desktopApp: openInDesktopApp })} {...(openInDesktopApp ? {} : { target: '_blank', rel: 'noreferrer' })}>
          {task.content}
        </a>
        <span className="up-next-meta">
          <PriorityDot priority={task.priority} />
          {formatProjectMeta(task, projectsById, sectionsById)}
          {task.due && (
            // Showing the due date here (not just in the ranked table)
            // means a recurring task that comes back around is visible
            // right in Up Next, not just something you find out about
            // when it unexpectedly reappears.
            <span className={isOverdue(task.due) ? 'due-overdue' : undefined}>· {formatDue(task.due)}</span>
          )}
          <DurationChip task={task} />
          <TaskIndicators hasDescription={!!task.description?.trim()} hasComments={hasComments} />
        </span>
      </span>
      <button
        type="button"
        className="icon-button up-next-remove"
        onClick={() => onRemove(task.id)}
        aria-label="Remove from Up Next"
        title="Remove from Up Next"
      >
        ↓
      </button>
    </li>
  )
}

// "≈ 2h 45m queued", plus a note on any tasks that aren't fully counted:
// how many fell back to the default duration, or — with no default set —
// how many have no duration and so add nothing to the total. Null when
// there's nothing to add up at all.
function formatUpNextTotal(tasks, defaultDurationMinutes) {
  let totalMinutes = 0
  let counted = 0
  let usingDefault = 0
  let unestimated = 0
  for (const task of tasks) {
    const { minutes, isDefault } = effectiveDurationMinutes(task, defaultDurationMinutes)
    if (minutes === null) {
      unestimated++
      continue
    }
    totalMinutes += minutes
    counted++
    if (isDefault) usingDefault++
  }
  if (counted === 0) return null

  const notes = []
  if (usingDefault > 0) notes.push(`${usingDefault} at default ${formatMinutes(defaultDurationMinutes)}`)
  if (unestimated > 0) notes.push(`${unestimated} unestimated`)
  return `≈ ${formatMinutes(totalMinutes)} queued${notes.length ? ` · ${notes.join(', ')}` : ''}`
}

export default function UpNext({
  tasks,
  projectsById,
  sectionsById,
  completingIds,
  onComplete,
  onRemove,
  taskIdsWithComments,
  openInDesktopApp,
  defaultDurationMinutes,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UP_NEXT_DROPPABLE_ID })

  if (tasks.length === 0) {
    return (
      <section className="up-next" ref={setNodeRef}>
        <h2>Up Next</h2>
        <p className={`up-next-empty${isOver ? ' is-drag-over' : ''}`}>
          Drag tasks here to line up what you'll do next.
        </p>
      </section>
    )
  }

  const total = formatUpNextTotal(tasks, defaultDurationMinutes)

  return (
    <section className="up-next" ref={setNodeRef}>
      <div className="up-next-header">
        <h2>Up Next</h2>
        {total && <span className="up-next-total">{total}</span>}
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="up-next-list">
          {tasks.map((task) => (
            <UpNextItem
              key={task.id}
              task={task}
              projectsById={projectsById}
              sectionsById={sectionsById}
              isCompleting={completingIds.has(task.id)}
              onComplete={onComplete}
              onRemove={onRemove}
              hasComments={taskIdsWithComments.has(task.id)}
              openInDesktopApp={openInDesktopApp}
            />
          ))}
        </ol>
      </SortableContext>
    </section>
  )
}
