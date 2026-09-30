import { areAllProjectsSelected, isProjectSelected, toggleAllProjects, toggleProject } from '../lib/projectFilter'

export default function ProjectFilter({ projects, selectedIds, onChange }) {
  return (
    <div className="project-filter-list">
      <label className="checkbox-option checkbox-option-all">
        <input
          type="checkbox"
          checked={areAllProjectsSelected(selectedIds, projects)}
          onChange={() => onChange(toggleAllProjects(selectedIds, projects))}
        />
        All projects
      </label>
      {projects.map((p) => (
        <label key={p.id} className="checkbox-option">
          <input
            type="checkbox"
            checked={isProjectSelected(selectedIds, p.id)}
            onChange={() => onChange(toggleProject(selectedIds, projects, p.id))}
          />
          {p.name}
        </label>
      ))}
    </div>
  )
}
