export const DAY_START_MINUTES = 9 * 60
export const DAY_END_MINUTES = 18 * 60
export const SLOT_MINUTES = 30

export type TimeRange = {
  start: number
  end: number
}

export const toMinutes = (time: string): number => {
  const [hours = '', minutes = ''] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export const toTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** Момент начала времени в локальном времени браузера — в миллисекундах. */
export const startTimestamp = (date: string, startTime: string): number =>
  new Date(`${date}T${startTime}:00`).getTime()

export const listStartTimes = (): string[] => {
  const times: string[] = []
  for (let minutes = DAY_START_MINUTES; minutes < DAY_END_MINUTES; minutes += SLOT_MINUTES) {
    times.push(toTime(minutes))
  }
  return times
}

export const isStartTime = (time: string): boolean => listStartTimes().includes(time)

export const slotsCount = (durationMinutes: number): number =>
  Math.ceil(durationMinutes / SLOT_MINUTES)

export const bookingRange = (startTime: string, durationMinutes: number): TimeRange => {
  const start = toMinutes(startTime)
  return { start, end: start + slotsCount(durationMinutes) * SLOT_MINUTES }
}

export const fitsInDay = (startTime: string, durationMinutes: number): boolean =>
  bookingRange(startTime, durationMinutes).end <= DAY_END_MINUTES

export const overlaps = (a: TimeRange, b: TimeRange): boolean => a.start < b.end && b.start < a.end
