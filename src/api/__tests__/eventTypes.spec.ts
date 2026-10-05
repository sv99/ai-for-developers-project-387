import { beforeEach, describe, expect, it, vi } from 'vitest'

const importApi = () => import('../eventTypes')

describe('eventTypes API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('creates an event type with a generated id', async () => {
    const { createEventType: create } = await importApi()

    const created = create({
      name: 'Встреча 15 минут',
      description: 'Короткий тип события для быстрого слота.',
      durationMinutes: 15,
    })

    expect(created.id).toBeTruthy()
    expect(created.name).toBe('Встреча 15 минут')
    expect(created.description).toBe('Короткий тип события для быстрого слота.')
    expect(created.durationMinutes).toBe(15)
  })

  it('starts with an empty list when nothing is stored', async () => {
    const { listEventTypes: list } = await importApi()

    expect(list()).toEqual([])
  })

  it('returns created types from the list in creation order', async () => {
    const { createEventType: create, listEventTypes: list } = await importApi()

    create({ name: 'Встреча 15 минут', description: '', durationMinutes: 15 })
    create({ name: 'Встреча 30 минут', description: '', durationMinutes: 30 })

    expect(list().map((type) => type.name)).toEqual(['Встреча 15 минут', 'Встреча 30 минут'])
  })

  it('persists types across reloads', async () => {
    const first = await importApi()
    first.createEventType({
      name: 'Встреча 30 минут',
      description: 'Базовый тип.',
      durationMinutes: 30,
    })

    vi.resetModules()
    const second = await importApi()
    const stored = second.listEventTypes()

    expect(stored).toHaveLength(1)
    expect(stored[0]?.name).toBe('Встреча 30 минут')
    expect(stored[0]?.durationMinutes).toBe(30)
  })

  it('rejects an empty name', async () => {
    const { createEventType: create } = await importApi()

    expect(() => create({ name: '   ', description: '', durationMinutes: 15 })).toThrow()
  })

  it('rejects a non-positive or fractional duration', async () => {
    const { createEventType: create } = await importApi()

    expect(() => create({ name: 'Встреча', description: '', durationMinutes: 0 })).toThrow()
    expect(() => create({ name: 'Встреча', description: '', durationMinutes: -5 })).toThrow()
    expect(() => create({ name: 'Встреча', description: '', durationMinutes: 12.5 })).toThrow()
  })

  it('seeds the default event type when nothing is stored', async () => {
    const { ensureDefaultEventTypes, listEventTypes: list } = await importApi()

    ensureDefaultEventTypes()

    const stored = list()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.name).toBe('Встреча 30 минут')
    expect(stored[0]?.durationMinutes).toBe(30)
    expect(stored[0]?.id).toBeTruthy()
  })

  it('keeps existing types when seeding', async () => {
    const {
      createEventType: create,
      ensureDefaultEventTypes,
      listEventTypes: list,
    } = await importApi()

    create({ name: 'Свой тип', description: '', durationMinutes: 15 })
    ensureDefaultEventTypes()

    expect(list().map((type) => type.name)).toEqual(['Свой тип'])
  })
})
