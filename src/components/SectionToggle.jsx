// The collapsible header shared by every section — Up Next, Tasks, Not yet,
// and each Settings section — so they all open and close the same way: a
// chevron, the section name, an optional count, and optional extras pinned
// to the right (Up Next's queued time, a settings "Reset to defaults") that
// stay visible while collapsed.
export default function SectionToggle({ title, count, expanded, onToggle, extra }) {
  return (
    <div className="section-header">
      <button type="button" className="section-toggle" aria-expanded={expanded} onClick={onToggle}>
        <span className="section-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        {title}
        {count != null && ` · ${count}`}
      </button>
      {extra && <span className="section-extra">{extra}</span>}
    </div>
  )
}
