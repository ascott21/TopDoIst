import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CompleteCheckbox from './CompleteCheckbox'
import PriorityDot from './PriorityDot'
import TaskIndicators from './TaskIndicators'
import { taskUrl, formatProjectMeta, formatDue, isOverdue } from '../lib/taskDisplay'
import { useCoarsePointer } from '../lib/useCoarsePointer'

// A dedicated droppable id for the empty state, since there are no sortable
// items yet to collide against. Once the list has items, dropping near any
// of them (via closestCenter) is enough — no separate container droppable
// needed.
export const EMPTY_DROPPABLE_ID = 'up-next-empty'

function UpNextItem({ task, projectsById, sectionsById, isCompleting, onComplete, onRemove, hasComments }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const isCoarse = useCoarsePointer()
  const dragProps = { ...attributes, ...listeners }
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`up-next-item${isDragging ? ' is-dragging' : ''}${!isCoarse ? ' row-draggable' : ''}`}
      // Same mouse-vs-touch split as the ranked table: whole item on a
      // precise pointer, handle-only on touch.
      {...(isCoarse ? {} : dragProps)}
    >
      <CompleteCheckbox checked={isCompleting} onComplete={() => onComplete(task.id)} dragProps={isCoarse ? dragProps : {}} />
      <span className="up-next-content">
        <a href={taskUrl(task)} target="_blank" rel="noreferrer">
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
        ×
      </button>
    </li>
  )
}

export default function UpNext({ tasks, projectsById, sectionsById, completingIds, onComplete, onRemove, taskIdsWithComments }) {
  const { setNodeRef, isOver } = useDroppable({ id: EMPTY_DROPPABLE_ID })

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

  return (
    <section className="up-next">
      <h2>Up Next</h2>
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
            />
          ))}
        </ol>
      </SortableContext>
    </section>
  )
}
