import { listEventTypes } from './eventTypes'
import { generateId } from './id'
import { bookingRange, fitsInDay, isStartTime, overlaps, startTimestamp } from './slots'
import type { Booking, Contact } from './types'

const STORAGE_KEY = 'calendar-bookings'

export type BookingInput = {
  eventTypeId: string
  date: string
  startTime: string
  contact: Contact
}

const readStorage = (): Booking[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeStorage = (bookings: Booking[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}

export const listBookings = (): Booking[] => readStorage()

/**
 * Предстоящие Записи — журнал владельца: активные Записи, начало которых ещё не прошло,
 * в порядке времени начала. Прошедшие и отменённые не показываются.
 */
export const listUpcomingBookings = (): Booking[] =>
  readStorage()
    .filter(
      (booking) =>
        booking.status === 'active' && startTimestamp(booking.date, booking.startTime) > Date.now(),
    )
    .sort((a, b) => startTimestamp(a.date, a.startTime) - startTimestamp(b.date, b.startTime))

/** Отменённая Запись остаётся в хранилище — меняется только статус, поэтому Слоты освобождаются. */
export const cancelBooking = (id: string): Booking => {
  const bookings = readStorage()
  const booking = bookings.find((item) => item.id === id)
  if (!booking) {
    throw new Error('Запись не найдена')
  }
  if (booking.status === 'cancelled') {
    throw new Error('Запись уже отменена')
  }

  const cancelled: Booking = { ...booking, status: 'cancelled' }
  writeStorage(bookings.map((item) => (item.id === id ? cancelled : item)))
  return cancelled
}

export const createBooking = (input: BookingInput): Booking => {
  const eventTypes = listEventTypes()
  const eventType = eventTypes.find((type) => type.id === input.eventTypeId)
  if (!eventType) {
    throw new Error('Тип события не найден')
  }
  if (!input.date) {
    throw new Error('Выберите дату')
  }
  if (!isStartTime(input.startTime)) {
    throw new Error('Выберите время начала из доступных')
  }
  if (!fitsInDay(input.startTime, eventType.durationMinutes)) {
    throw new Error('Событие не помещается до конца рабочего дня')
  }

  const name = input.contact.name.trim()
  const phone = input.contact.phone.trim()
  if (!name) {
    throw new Error('Введите имя')
  }
  if (!phone) {
    throw new Error('Введите телефон')
  }

  const range = bookingRange(input.startTime, eventType.durationMinutes)
  const durations = new Map(eventTypes.map((type) => [type.id, type.durationMinutes]))
  const conflict = readStorage().some((booking) => {
    if (booking.status !== 'active' || booking.date !== input.date) {
      return false
    }
    const otherDuration = durations.get(booking.eventTypeId)
    if (!otherDuration) {
      return false
    }
    return overlaps(range, bookingRange(booking.startTime, otherDuration))
  })
  if (conflict) {
    throw new Error('Это время уже занято. Выберите другое время.')
  }

  const booking: Booking = {
    id: generateId(),
    eventTypeId: eventType.id,
    date: input.date,
    startTime: input.startTime,
    contact: { name, phone },
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  writeStorage([...readStorage(), booking])
  return booking
}
