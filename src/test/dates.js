// Formats a Date as Todoist's floating local datetime ("YYYY-MM-DDTHH:MM:SS",
// no offset), so tests behave the same in any timezone.
export function localDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function localDate(date) {
  return localDateTime(date).slice(0, 10)
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}
