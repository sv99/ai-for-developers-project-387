import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importApi = async () => {
  const eventTypes = await import('../eventTypes')
  const bookings = await import('../bookings')
  const availability = await import('../availability')
  return { ...eventTypes, ...bookings, ...availability }
}

type Api = Awaited<ReturnType<typeof importApi>>

const createType = (api: Api, durationMinutes = 30) =>
  api.createEventType({ name: 'Встреча', description: '', durationMinutes })

const contact = { name: 'Анна', phone: '+7 900 000-00-00' }

const TODAY = '2026-03-28'
const TOMORROW = '2026-03-29'
const YESTERDAY = '2026-03-27'
/** Сегодня + 14 дней — последний день окна регистрации. */
const WINDOW_END = '2026-04-11'
const BEYOND_WINDOW = '2026-04-12'

describe('availability API', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:15:00'))
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the 18 half-hour slots of a day as free', async () => {
    const api = await importApi()

    const slots = api.listDaySlots(TOMORROW)

    expect(slots).toHaveLength(18)
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30', status: 'free' })
    expect(slots[17]).toEqual({ startTime: '17:30', endTime: '18:00', status: 'free' })
    expect(api.countFreeSlots(TOMORROW)).toBe(18)
  })

  it('marks every slot of an active booking as taken', async () => {
    const api = await importApi()
    const type = createType(api, 60)

    api.createBooking({ eventTypeId: type.id, date: TOMORROW, startTime: '10:00', contact })

    const taken = api
      .listDaySlots(TOMORROW)
      .filter((slot) => slot.status === 'taken')
      .map((slot) => slot.startTime)

    expect(taken).toEqual(['10:00', '10:30'])
    expect(api.countFreeSlots(TOMORROW)).toBe(16)
  })

  it('takes slots occupied by bookings of other event types', async () => {
    const api = await importApi()
    const short = createType(api, 30)
    const long = createType(api, 60)

    api.createBooking({ eventTypeId: long.id, date: TOMORROW, startTime: '12:00', contact })

    const starts = api.listDayStarts(TOMORROW, short.durationMinutes)

    expect(starts.find((slot) => slot.startTime === '12:00')?.status).toBe('taken')
    expect(starts.find((slot) => slot.startTime === '12:30')?.status).toBe('taken')
    expect(starts.find((slot) => slot.startTime === '13:00')?.status).toBe('free')
  })

  it('marks the whole past day as taken', async () => {
    const api = await importApi()

    expect(api.countFreeSlots(YESTERDAY)).toBe(0)
    expect(api.listDaySlots(YESTERDAY).every((slot) => slot.status === 'taken')).toBe(true)
  })

  it('marks the days beyond the booking window as taken', async () => {
    const api = await importApi()

    expect(api.bookingWindowEnd()).toBe(WINDOW_END)
    expect(api.isBookableDate(TOMORROW)).toBe(true)
    expect(api.isBookableDate(WINDOW_END)).toBe(true)
    expect(api.isBookableDate(BEYOND_WINDOW)).toBe(false)
    expect(api.countFreeSlots(BEYOND_WINDOW)).toBe(0)
    expect(api.listDaySlots(BEYOND_WINDOW).every((slot) => slot.status === 'taken')).toBe(true)
  })

  it('marks the start times that already passed today as taken', async () => {
    const api = await importApi()

    const slots = api.listDaySlots(TODAY)
    const status = (startTime: string) => slots.find((slot) => slot.startTime === startTime)?.status

    expect(status('09:00')).toBe('taken')
    expect(status('12:00')).toBe('taken')
    expect(status('12:30')).toBe('free')
    expect(api.countFreeSlots(TODAY)).toBe(11)
  })

  it('leaves out start times where the event does not fit before 18:00', async () => {
    const api = await importApi()

    const starts = api.listDayStarts(TOMORROW, 60)

    expect(starts[starts.length - 1]?.startTime).toBe('17:00')
    expect(starts.some((slot) => slot.startTime === '17:30')).toBe(false)
  })

  it('frees the slots of a cancelled booking', async () => {
    const api = await importApi()
    const type = createType(api, 60)

    api.createBooking({ eventTypeId: type.id, date: TOMORROW, startTime: '10:00', contact })

    const stored = JSON.parse(localStorage.getItem('calendar-bookings') ?? '[]')
    localStorage.setItem(
      'calendar-bookings',
      JSON.stringify(
        stored.map((booking: { status: string }) => ({ ...booking, status: 'cancelled' })),
      ),
    )

    expect(api.countFreeSlots(TOMORROW)).toBe(18)
  })

  it('lets the visitor book the time of a cancelled booking again', async () => {
    const api = await importApi()
    const type = createType(api, 30)
    const booking = api.createBooking({
      eventTypeId: type.id,
      date: TOMORROW,
      startTime: '10:00',
      contact,
    })

    api.cancelBooking(booking.id)

    expect(api.countFreeSlots(TOMORROW)).toBe(18)

    expect(() =>
      api.createBooking({ eventTypeId: type.id, date: TOMORROW, startTime: '10:00', contact }),
    ).not.toThrow()
  })
})
