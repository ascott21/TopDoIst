// A task with more than one lead-time label is always a tagging mistake.
// The longest lead is the one used (see src/lib/leadTime.js); this flags it
// so it gets fixed in Todoist.
export default function LeadConflictFlag({ lead }) {
  if (!lead?.hasConflict) return null
  const text = `${lead.leadLabels.join(' + ')} are both set — using ${lead.activeLabel ?? 'the longer one'}`
  return (
    <span className="lead-conflict" title={text} aria-label={text} role="img">
      ⚠ {lead.leadLabels.length} leads
    </span>
  )
}
