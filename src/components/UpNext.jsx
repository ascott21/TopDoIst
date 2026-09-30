import { closestCenter, pointerWithin, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CompleteCheckbox from './CompleteCheckbox'
import PriorityDot from './PriorityDot'
import TaskIndicators from './TaskIndicators'
import TaskLink from './TaskLink'
import { formatProjectMeta, formatDue, isOverdue } from '../lib/taskDisplay'

// The whole section is one droppable zone. It decides whether a drop lands in
// Up Next at all, and is the drop target itself while the list is empty.
export const UP_NEXT_DROPPABLE_ID = 'up-next'

// closestCenter alone always reports the nearest droppable however far away
// it is, so a task dropped back onto the ranked table would still land in
// Up Next. A drop only counts while the pointer is inside the section;
// there, the closest item sets the position.
export function upNextCollisionDetection(args) {
  const isOverUpNext = pointerWithin(args).some((c) => c.id === UP_NEXT_DROPPABLE_ID)
  if (!isOverUpNext) return []

  const items = args.droppableContainers.filter((c) => c.id !== UP_NEXT_DROPPABLE_ID)
  const closestItems = closestCenter({ ...args, droppableContainers: items })
  return closestItems.length > 0 ? closestItems : [{ id: UP_NEXT_DROPPABLE_ID }]
}

function UpNextItem({
  task,
  projectsById,
  sectionsById,
  isCompleting,
  onComplete,
  onRemove,
  hasComments,
  openInDesktopApp,
  isCoarsePointer,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const dragProps = { ...attributes, ...listeners }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`up-next-item${isDragging ? ' is-dragging' : ''}${isCoarsePointer ? '' : ' row-draggable'}`}
      // Same split as the ranked table: drag from anywhere on a mouse, only
      // from the checkbox on touch.
      {...(isCoarsePointer ? {} : dragProps)}
    >
      <CompleteCheckbox
        checked={isCompleting}
        onComplete={() => onComplete(task.id)}
        dragProps={isCoarsePointer ? dragProps : {}}
      />
      <span className="up-next-content">
        <TaskLink task={task} openInDesktopApp={openInDesktopApp} />
        <span className="up-next-meta">
          <PriorityDot priority={task.priority} />
          {formatProjectMeta(task, projectsById, sectionsById)}
          {task.due && (
            // Makes it visible when a recurring task has come back around
            // with a new date, rather than it silently reappearing.
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
        ↓
      </button>
    </li>
  )
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
  isCoarsePointer,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UP_NEXT_DROPPABLE_ID })

  return (
    <section className="up-next" ref={setNodeRef}>
      <h2>Up Next</h2>
      {tasks.length === 0 ? (
        <p className={`up-next-empty${isOver ? ' is-drag-over' : ''}`}>Drag tasks here to line up what you'll do next.</p>
      ) : (
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
                isCoarsePointer={isCoarsePointer}
              />
            ))}
          </ol>
        </SortableContext>
      )}
    </section>
  )
}
