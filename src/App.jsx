import { useEffect, useMemo, useState } from 'react'
import { clearStoredToken, fetchActiveTasks, fetchProjects, getStoredToken, storeToken } from './api/todoist'
import { DEFAULT_WEIGHTS, rankTasks } from './lib/scoring'
import TokenGate from './components/TokenGate'
import WeightControls from './components/WeightControls'
import TaskTable from './components/TaskTable'
import UpNext from './components/UpNext'

const UP_NEXT_KEY = 'topdoist:upnext'

function loadUpNextIds() {
  try {
    return JSON.parse(localStorage.getItem(UP_NEXT_KEY)) ?? []
  } catch {
    return []
  }
}

function saveUpNextIds(ids) {
  try {
    localStorage.setItem(UP_NEXT_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures
  }
}

export default function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [projectFilter, setProjectFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upNextIds, setUpNextIds] = useState(loadUpNextIds)

  useEffect(() => saveUpNextIds(upNextIds), [upNextIds])

  async function loadFromTodoist(activeToken) {
    setLoading(true)
    setError('')
    try {
      const [taskData, projectData] = await Promise.all([
        fetchActiveTasks(activeToken),
        fetchProjects(activeToken),
      ])
      setTasks(taskData)
      setProjects(projectData)
      storeToken(activeToken)
      setToken(activeToken)
    } catch (err) {
      setError(err.message || 'Something went wrong loading your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadFromTodoist(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])

  // Tasks the user has manually dragged into Up Next, in the order they put
  // them, dropping any ids for tasks that no longer exist (completed/deleted).
  const upNextTasks = useMemo(
    () => upNextIds.map((id) => tasksById[id]).filter(Boolean),
    [upNextIds, tasksById],
  )

  const filteredTasks = useMemo(() => {
    const upNextSet = new Set(upNextIds)
    return tasks.filter((t) => {
      if (upNextSet.has(t.id)) return false
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false
      return true
    })
  }, [tasks, projectFilter, upNextIds])

  const ranked = useMemo(() => rankTasks(filteredTasks, { weights }), [filteredTasks, weights])

  function handleUpNextDrop(taskId, targetIndex) {
    setUpNextIds((prev) => {
      const withoutTask = prev.filter((id) => id !== taskId)
      const insertAt = Math.min(targetIndex, withoutTask.length)
      return [...withoutTask.slice(0, insertAt), taskId, ...withoutTask.slice(insertAt)]
    })
  }

  function handleUpNextRemove(taskId) {
    setUpNextIds((prev) => prev.filter((id) => id !== taskId))
  }

  function handleSignOut() {
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
    setUpNextIds([])
  }

  if (!token) {
    return <TokenGate onSubmit={loadFromTodoist} error={error} loading={loading} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>TopDoist</h1>
        <div className="app-header-actions">
          <button type="button" onClick={() => loadFromTodoist(token)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="link-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <UpNext
        tasks={upNextTasks}
        projectsById={projectsById}
        onDrop={handleUpNextDrop}
        onRemove={handleUpNextRemove}
      />

      <div className="app-body">
        <aside className="app-sidebar">
          <WeightControls weights={weights} onChange={setWeights} onReset={() => setWeights(DEFAULT_WEIGHTS)} />

          <div className="project-filter">
            <h2>Project</h2>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className="app-main">
          <TaskTable ranked={ranked} projectsById={projectsById} />
        </main>
      </div>
    </div>
  )
}
