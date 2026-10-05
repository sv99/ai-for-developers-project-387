import { beforeEach, describe, expect, it, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import { listEventTypes } from '@/api/eventTypes'
import { getCalendarName } from '@/api/settings'

import BookingPage from '../BookingPage.vue'
import EventsPage from '../EventsPage.vue'
import { fifteenMinutes, thirtyMinutes } from './fixtures'

vi.mock('@/api/eventTypes', () => ({
  createEventType: vi.fn(),
  listEventTypes: vi.fn(),
}))

vi.mock('@/api/settings', () => ({
  DEFAULT_CALENDAR_NAME: 'Владелец',
  getCalendarName: vi.fn(),
  setCalendarName: vi.fn(),
}))

const mockedList = vi.mocked(listEventTypes)
const mockedGetName = vi.mocked(getCalendarName)

const mountPage = async () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/events', component: EventsPage },
      { path: '/booking', component: BookingPage },
    ],
  })
  await router.push('/events')
  await router.isReady()
  const wrapper = mount(EventsPage, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedList.mockReturnValue([])
    mockedGetName.mockReturnValue('Владелец')
  })

  it('renders the host card with the owner name, role and type-choice heading', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('.host-name').text()).toBe('Владелец')
    expect(wrapper.text()).toContain('Владелец календаря')
    expect(wrapper.text()).toContain('Выберите тип события')
    expect(wrapper.text()).toContain('Нажмите на карточку, чтобы открыть календарь')
  })

  it('shows the configured calendar name', async () => {
    mockedGetName.mockReturnValue('Команда Тота')
    const { wrapper } = await mountPage()

    expect(wrapper.find('.host-name').text()).toBe('Команда Тота')
  })

  it('starts with an empty state when there are no types yet', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.text()).toContain('Пока нет ни одного типа событий')
  })

  it('lists existing types with name, duration and description', async () => {
    mockedList.mockReturnValue([fifteenMinutes, thirtyMinutes])
    const { wrapper } = await mountPage()

    expect(wrapper.text()).toContain('Встреча 15 минут')
    expect(wrapper.text()).toContain('15 мин')
    expect(wrapper.text()).toContain('Короткий тип события для быстрого слота.')
    expect(wrapper.text()).toContain('Встреча 30 минут')
    expect(wrapper.text()).toContain('30 мин')
  })

  it('leads to the booking page with the chosen type', async () => {
    mockedList.mockReturnValue([fifteenMinutes, thirtyMinutes])
    const { wrapper, router } = await mountPage()

    await wrapper.findAll('.type-card')[1]?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/booking')
    expect(router.currentRoute.value.query.type).toBe('et-2')
  })
})
