import { useState } from 'react'

// Drag payload identifies where a task is coming from, so dropping a task
// already in Up Next onto the list reorders it instead of duplicating it.
const DRAG_TYPE = 'application/x-topdoist-task-id'

export default function UpNext({ tasks, projectsById, onDrop, onRemove }) {
  const [overIndex, setOverIndex] = useState(null)
  const [isOverList, setIsOverList] = useState(false)

  function handleListDragOver(e) {
    e.preventDefault()
    setIsOverList(true)
  }

  function handleListDrop(e) {
    e.preventDefault()
    setIsOverList(false)
    setOverIndex(null)
    const taskId = e.dataTransfer.getData(DRAG_TYPE)
    if (!taskId) return
    // Dropped on empty space below the last item: append to the end.
    onDrop(taskId, tasks.length)
  }

  function handleItemDragOver(index) {
    return (e) => {
      e.preventDefault()
      e.stopPropagation()
      setOverIndex(index)
    }
  }

  function handleItemDrop(index) {
    return (e) => {
      e.preventDefault()
      e.stopPropagation()
      setOverIndex(null)
      setIsOverList(false)
      const taskId = e.dataTransfer.getData(DRAG_TYPE)
      if (!taskId) return
      onDrop(taskId, index)
    }
  }

  return (
    <section
      className={`up-next ${isOverList ? 'is-drag-over' : ''}`}
      onDragOver={handleListDragOver}
      onDragLeave={() => setIsOverList(false)}
      onDrop={handleListDrop}
    >
      <h2>Up Next</h2>
      {tasks.length === 0 ? (
        <p className="up-next-empty">Drag tasks here to line up what you'll do next.</p>
      ) : (
        <ol className="up-next-list">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`up-next-item ${overIndex === index ? 'is-drag-target' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, task.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={handleItemDragOver(index)}
              onDrop={handleItemDrop(index)}
            >
              <span className="drag-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="up-next-content">
                <a href={task.url} target="_blank" rel="noreferrer">
                  {task.content}
                </a>
                <span className="up-next-meta">{projectsById[task.project_id]?.name ?? ''}</span>
              </span>
              <button type="button" className="link-button" onClick={() => onRemove(task.id)}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export { DRAG_TYPE }
