/** `YYYY-MM-DDTHH:MM` in local time, which is what `<input type="datetime-local">` speaks. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** One hour ahead, rounded to the minute: the dialog's starting value. */
export function defaultScheduleValue(now = Date.now()): string {
  const next = new Date(now + 60 * 60 * 1000)
  next.setSeconds(0, 0)
  return toLocalInputValue(next)
}
