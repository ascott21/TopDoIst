import { useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { closeTask, updateTaskLabels } from './api/todoist'
import { DEFAULT_WEIGHTS, DEFAULT_LABEL_BONUSES, rankTasks } from './lib/scoring'
import { DEFAULT_ASSIGNMENT_MODE, passesAssignmentFilter } from './lib/assignment'
import { UP_NEXT_LABEL, hasUpNextLabel, withLabelRemoved } from './lib/upNextLabel'
import { isProjectSelected } from './lib/projectFilter'
import { taskMatchesSearch } from './lib/taskSearch'
import { usePersistentState } from './hooks/usePersistentState'
import { useTodoistData } from './hooks/useTodoistData'
import { useUpNext } from './hooks/useUpNext'
import { useNow } from './hooks/useNow'
import { useCoarsePointer } from './hooks/useCoarsePointer'
import TokenGate from './components/TokenGate'
import SettingsPanel from './components/SettingsPanel'
import TaskTable from './components/TaskTable'
import UpNext, { upNextCollisionDetection } from './components/UpNext'

// Stored as a bare string rather than JSON.
const PLAIN_STRING = { serialize: String, deserialize: String }

// Merged over the defaults, so a weight added later still gets a value for
// anyone with an older saved set.
const WEIGHTS_STORAGE = {
  serialize: JSON.stringify,
  deserialize: (raw) => ({ ...DEFAULT_WEIGHTS, ...JSON.parse(raw) }),
}

const CLOCK_INTERVAL_MS = 60000

export default function App() {
  const {
    token,
    signIn,
    signOut,
    refresh,
    loading,
    error,
    setError,
    tasks,
    setTasks,
    projects,
    sections,
    labels,
    currentUserId,
    taskIdsWithComments,
    beginLocalChange,
    updateLabels,
  } = useTodoistData()

  // Settings, each saved in this browser.
  const [weights, setWeights] = usePersistentState('topdoist:weights', DEFAULT_WEIGHTS, WEIGHTS_STORAGE)
  const [labelBonuses, setLabelBonuses] = usePersistentState('topdoist:labelBonuses', DEFAULT_LABEL_BONUSES)
  // `null` means no filter; see lib/projectFilter.js.
  const [selectedProjectIds, setSelectedProjectIds] = usePersistentState('topdoist:selectedProjectIds', null)
  const [assignmentMode, setAssignmentMode] = usePersistentState(
    'topdoist:assignmentMode',
    DEFAULT_ASSIGNMENT_MODE,
    PLAIN_STRING,
  )
  const [focusMode, setFocusMode] = usePersistentState('topdoist:focusMode', false)
  const [openInDesktopApp, setOpenInDesktopApp] = usePersistentState('topdoist:openInDesktopApp', false)

  const [searchQuery, setSearchQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeDragId, setActiveDragId] = useState(null)
  // Tasks being marked complete: shown checked right away, removed once
  // Todoist confirms.
  const [completingIds, setCompletingIds] = useState(() => new Set())

  const now = useNow(CLOCK_INTERVAL_MS)
  const isCoarsePointer = useCoarsePointer()

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const sectionsById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections])
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])
  const rankOptions = useMemo(() => ({ weights, labelBonuses, now }), [weights, labelBonuses, now])

  const upNext = useUpNext({ tasks, selectedProjectIds, rankOptions, updateLabels })

  // Everything not in Up Next, filtered by the settings and the search box.
  const ranked = useMemo(() => {
    const visible = tasks.filter(
      (t) =>
        !hasUpNextLabel(t) &&
        isProjectSelected(selectedProjectIds, t.project_id) &&
        passesAssignmentFilter(t, { mode: assignmentMode, project: projectsById[t.project_id], currentUserId }) &&
        taskMatchesSearch(t, searchQuery, { projectsById, sectionsById }),
    )
    return rankTasks(visible, rankOptions)
  }, [tasks, selectedProjectIds, assignmentMode, projectsById, sectionsById, currentUserId, searchQuery, rankOptions])

  // A single PointerSensor covers mouse, touch, and pen; adding TouchSensor
  // alongside it makes both fire for the same touch and misfire. The short
  // hold before a drag starts lets a plain tap still reach the checkbox, and
  // keeps a touch scroll from being taken for a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 6 } }))
  const endDragRef = useRef(null)

  function handleDragStart(event) {
    endDragRef.current = beginLocalChange()
    setActiveDragId(event.active.id)
  }

  // Runs after both a drop and a cancelled drag (Escape).
  function finishDrag() {
    endDragRef.current?.()
    setActiveDragId(null)
  }

  function handleDragEnd({ active, over }) {
    finishDrag()
    if (over) upNext.drop(active.id, over.id)
  }

  async function handleComplete(taskId) {
    const task = tasksById[taskId]
    const endChange = beginLocalChange()
    setCompletingIds((prev) => new Set(prev).add(taskId))
    try {
      await closeTask(token, taskId)
      // A recurring task isn't removed when closed: Todoist moves it to its
      // next date, labels and all, so it would come straight back into Up
      // Next. Removing the label is best-effort; the task is closed either way.
      if (task?.due?.is_recurring && hasUpNextLabel(task)) {
        await updateTaskLabels(token, taskId, withLabelRemoved(task.labels, UP_NEXT_LABEL)).catch(() => {})
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      upNext.forget(taskId)
    } catch (err) {
      setError(err.message || "Couldn't mark that task complete. Try again.")
    } finally {
      endChange()
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Settings and the Up Next order stay saved; they're harmless to keep.
  function handleSignOut() {
    signOut()
    setSearchQuery('')
  }

  if (!token) {
    return <TokenGate onSubmit={signIn} error={error} loading={loading} />
  }

  const activeDragTask = activeDragId ? tasksById[activeDragId] : null
  const taskDisplayProps = {
    projectsById,
    sectionsById,
    completingIds,
    onComplete: handleComplete,
    taskIdsWithComments,
    openInDesktopApp,
    isCoarsePointer,
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <img src="/icon.svg" alt="" width="28" height="28" className="app-logo" />
          <h1>TopDoist</h1>
        </div>
        <div className="app-header-actions">
          <button type="button" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className={`icon-button ${focusMode ? 'is-active' : ''}`}
            onClick={() => setFocusMode((f) => !f)}
            aria-pressed={focusMode}
            aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode (show only Up Next)'}
            title={focusMode ? 'Exit focus mode' : 'Focus mode: show only Up Next'}
          >
            🎯
          </button>
          <button type="button" className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            ⚙
          </button>
          <button type="button" className="link-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={upNextCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
      >
        <UpNext tasks={upNext.upNextTasks} onRemove={upNext.remove} {...taskDisplayProps} />

        {!focusMode && (
          <main className="app-main">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tasks"
              />
              {searchQuery && (
                <button type="button" className="icon-button" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  ×
                </button>
              )}
            </div>
            <TaskTable
              ranked={ranked}
              emptyMessage={searchQuery ? `No tasks match "${searchQuery}".` : undefined}
              {...taskDisplayProps}
            />
          </main>
        )}

        <DragOverlay>{activeDragTask ? <div className="drag-overlay-card">{activeDragTask.content}</div> : null}</DragOverlay>
      </DndContext>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        assignmentMode={assignmentMode}
        onAssignmentModeChange={setAssignmentMode}
        projects={projects}
        selectedProjectIds={selectedProjectIds}
        onSelectedProjectIdsChange={setSelectedProjectIds}
        weights={weights}
        onWeightsChange={setWeights}
        labelBonuses={labelBonuses}
        availableLabels={labels.map((l) => l.name)}
        onLabelBonusesChange={setLabelBonuses}
        openInDesktopApp={openInDesktopApp}
        onOpenInDesktopAppChange={setOpenInDesktopApp}
      />
    </div>
  )
}
