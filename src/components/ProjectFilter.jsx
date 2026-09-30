export default function ProjectFilter({ projects, isSelected, allSelected, onToggleProject, onToggleAll }) {
  return (
    <div className="project-filter-list">
      <label className="checkbox-option checkbox-option-all">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
        All projects
      </label>
      {projects.map((p) => (
        <label key={p.id} className="checkbox-option">
          <input type="checkbox" checked={isSelected(p.id)} onChange={() => onToggleProject(p.id)} />
          {p.name}
        </label>
      ))}
    </div>
  )
}
