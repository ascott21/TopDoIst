import { taskUrl } from '../lib/taskDisplay'

// A todoist:// link hands off to the desktop app instead of loading a page,
// so only the web link opens in a new tab.
export default function TaskLink({ task, openInDesktopApp }) {
  const newTabProps = openInDesktopApp ? {} : { target: '_blank', rel: 'noreferrer' }
  return (
    <a href={taskUrl(task, { desktopApp: openInDesktopApp })} {...newTabProps}>
      {task.content}
    </a>
  )
}
