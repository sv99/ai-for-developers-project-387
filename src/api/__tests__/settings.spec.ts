import { beforeEach, describe, expect, it, vi } from 'vitest'

const importApi = () => import('../settings')

describe('settings API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults the calendar name to «Владелец»', async () => {
    const { getCalendarName } = await importApi()

    expect(getCalendarName()).toBe('Владелец')
  })

  it('stores a new calendar name and keeps it across reloads', async () => {
    const first = await importApi()
    first.setCalendarName('Команда Тота')

    vi.resetModules()
    const second = await importApi()

    expect(second.getCalendarName()).toBe('Команда Тота')
  })

  it('trims the stored name', async () => {
    const { getCalendarName, setCalendarName } = await importApi()

    setCalendarName('  Тота  ')

    expect(getCalendarName()).toBe('Тота')
  })

  it('rejects an empty name', async () => {
    const { setCalendarName } = await importApi()

    expect(() => setCalendarName('   ')).toThrow()
  })

  it('falls back to the default when the stored name is blank', async () => {
    localStorage.setItem('calendar-name', '   ')
    const { getCalendarName } = await importApi()

    expect(getCalendarName()).toBe('Владелец')
  })
})
