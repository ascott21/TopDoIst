import { useEffect, useMemo, useState } from 'react'
import { clearStoredToken, fetchActiveTasks, fetchProjects, getStoredToken, storeToken } from './api/todoist'
import { DEFAULT_WEIGHTS, rankTasks } from './lib/scoring'
import TokenGate from './components/TokenGate'
import WeightControls from './components/WeightControls'
import TaskTable from './components/TaskTable'

export default function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [projectFilter, setProjectFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const filteredTasks = useMemo(() => {
    if (projectFilter === 'all') return tasks
    return tasks.filter((t) => t.project_id === projectFilter)
  }, [tasks, projectFilter])

  const ranked = useMemo(() => rankTasks(filteredTasks, { weights }), [filteredTasks, weights])

  function handleSignOut() {
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
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
