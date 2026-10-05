const STORAGE_KEY = 'calendar-name'

export const DEFAULT_CALENDAR_NAME = 'Владелец'

export const getCalendarName = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored || !stored.trim()) {
    return DEFAULT_CALENDAR_NAME
  }
  return stored
}

export const setCalendarName = (name: string): void => {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Введите имя календаря')
  }
  localStorage.setItem(STORAGE_KEY, trimmed)
}
