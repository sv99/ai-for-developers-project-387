export interface EventType {
  id: string
  name: string
  description: string
  durationMinutes: number
}

export interface Contact {
  name: string
  phone: string
}

export type BookingStatus = 'active' | 'cancelled'

export interface Booking {
  id: string
  eventTypeId: string
  date: string
  startTime: string
  contact: Contact
  status: BookingStatus
  createdAt: string
}
