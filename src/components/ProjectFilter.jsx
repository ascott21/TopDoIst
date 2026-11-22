import { useMemo } from 'react'
import { orderProjectsLikeTodoist } from '../lib/projectTree'

export default function ProjectFilter({ projects, isSelected, allSelected, onToggleProject, onToggleAll }) {
  const orderedProjects = useMemo(() => orderProjectsLikeTodoist(projects), [projects])

  return (
    <div className="project-filter-list">
      <label className="checkbox-option checkbox-option-all">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
        All projects
      </label>
      {orderedProjects.map(({ project: p, depth }) => (
        <label
          key={p.id}
          className={`checkbox-option${depth > 0 ? ' checkbox-option-nested' : ''}`}
          style={{ '--project-depth': depth }}
        >
          <input type="checkbox" checked={isSelected(p.id)} onChange={() => onToggleProject(p.id)} />
          {p.name}
        </label>
      ))}
    </div>
  )
}
