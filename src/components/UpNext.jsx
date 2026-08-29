import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CompleteCheckbox from './CompleteCheckbox'
import { taskUrl, formatProjectMeta } from '../lib/taskDisplay'
import { useCoarsePointer } from '../lib/useCoarsePointer'

// A dedicated droppable id for the empty state, since there are no sortable
// items yet to collide against. Once the list has items, dropping near any
// of them (via closestCenter) is enough — no separate container droppable
// needed.
export const EMPTY_DROPPABLE_ID = 'up-next-empty'

function UpNextItem({ task, projectsById, sectionsById, isCompleting, onComplete, onRemove }) {
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
        <span className="up-next-meta">{formatProjectMeta(task, projectsById, sectionsById)}</span>
      </span>
      <button type="button" className="link-button" onClick={() => onRemove(task.id)}>
        Remove
      </button>
    </li>
  )
}

export default function UpNext({ tasks, projectsById, sectionsById, completingIds, onComplete, onRemove }) {
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
            />
          ))}
        </ol>
      </SortableContext>
    </section>
  )
}
