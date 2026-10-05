import { generateId } from './id'
import type { EventType } from './types'

const STORAGE_KEY = 'calendar-event-types'

type EventTypeInput = Omit<EventType, 'id'>

const readStorage = (): EventType[] => {
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

const writeStorage = (eventTypes: EventType[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventTypes))
}

export const listEventTypes = (): EventType[] => readStorage()

export const createEventType = (input: EventTypeInput): EventType => {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Название типа события обязательно')
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
    throw new Error('Длительность должна быть целым числом минут')
  }
  const eventType: EventType = {
    id: generateId(),
    name,
    description: input.description.trim(),
    durationMinutes: input.durationMinutes,
  }
  writeStorage([...readStorage(), eventType])
  return eventType
}

const DEFAULT_EVENT_TYPE: EventTypeInput = {
  name: 'Встреча 30 минут',
  description: 'Базовый тип события для бронирования.',
  durationMinutes: 30,
}

export const ensureDefaultEventTypes = (): void => {
  if (readStorage().length > 0) {
    return
  }
  createEventType(DEFAULT_EVENT_TYPE)
}
