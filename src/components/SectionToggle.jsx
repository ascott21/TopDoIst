// The collapsible header shared by every section (Up Next, Tasks, Not yet),
// so they all open and close the same way: a chevron, the section name, and
// a count, with optional extra info pinned to the right (e.g. Up Next's
// queued time) that stays visible while collapsed.
export default function SectionToggle({ title, count, expanded, onToggle, extra }) {
  return (
    <div className="section-header">
      <button type="button" className="section-toggle" aria-expanded={expanded} onClick={onToggle}>
        <span className="section-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        {title} · {count}
      </button>
      {extra && <span className="section-extra">{extra}</span>}
    </div>
  )
}
