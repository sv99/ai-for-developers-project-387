import type { EventType } from '@/api/types'

export const fifteenMinutes: EventType = {
  id: 'et-1',
  name: 'Встреча 15 минут',
  description: 'Короткий тип события для быстрого слота.',
  durationMinutes: 15,
}

export const thirtyMinutes: EventType = {
  id: 'et-2',
  name: 'Встреча 30 минут',
  description: 'Базовый тип события для бронирования.',
  durationMinutes: 30,
}
