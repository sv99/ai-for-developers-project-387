import { beforeEach, describe, expect, it, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import { countFreeSlots, listDayStarts } from '@/api/availability'
import type { DaySlot } from '@/api/availability'
import { createBooking } from '@/api/bookings'
import { listEventTypes } from '@/api/eventTypes'
import { fitsInDay, listStartTimes, SLOT_MINUTES, toMinutes, toTime } from '@/api/slots'

import MonthCalendar from '@/components/MonthCalendar.vue'
import BookingPage from '../BookingPage.vue'
import { thirtyMinutes } from './fixtures'

vi.mock('@/api/eventTypes', () => ({
  createEventType: vi.fn(),
  listEventTypes: vi.fn(),
}))

vi.mock('@/api/bookings', () => ({
  createBooking: vi.fn(),
}))

vi.mock('@/api/availability', () => ({
  bookingWindowEnd: vi.fn(() => '2026-10-19'),
  countFreeSlots: vi.fn(),
  listDayStarts: vi.fn(),
}))

const mockedListTypes = vi.mocked(listEventTypes)
const mockedListDayStarts = vi.mocked(listDayStarts)
const mockedCountFreeSlots = vi.mocked(countFreeSlots)
const mockedCreateBooking = vi.mocked(createBooking)

const DATE = '2026-10-05'
const EmptyRoute = { template: '<div />' }

type Wrapper = Awaited<ReturnType<typeof mountPage>>['wrapper']

const buildSlots = (taken: string[] = [], durationMinutes = 30): DaySlot[] =>
  listStartTimes()
    .filter((startTime) => fitsInDay(startTime, durationMinutes))
    .map((startTime) => ({
      startTime,
      endTime: toTime(toMinutes(startTime) + SLOT_MINUTES),
      status: taken.includes(startTime) ? 'taken' : 'free',
    }))

const mountPage = async (query: Record<string, string> = { type: thirtyMinutes.id }) => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/events', component: EmptyRoute },
      { path: '/booking', component: BookingPage },
    ],
  })
  await router.push({ path: '/booking', query })
  await router.isReady()
  const wrapper = mount(BookingPage, { global: { plugins: [router] } })
  return { wrapper, router }
}

const pickDate = async (wrapper: Wrapper, date = DATE) => {
  wrapper.findComponent(MonthCalendar).vm.$emit('update:modelValue', date)
  await flushPromises()
}

const slotWith = (wrapper: Wrapper, time: string) => {
  const slot = wrapper
    .findAll('.slot')
    .find((item) => item.find('.slot-time').text().startsWith(`${time} -`))
  if (!slot) throw new Error(`Слот ${time} не найден`)
  return slot
}

const infoValues = (wrapper: Wrapper) => wrapper.findAll('.info-value').map((item) => item.text())

const continueButton = (wrapper: Wrapper) => {
  const button = wrapper.findAll('.actions .el-button')[1]
  if (!button) throw new Error('Кнопка «Продолжить» не найдена')
  return button
}

const fillContact = async (wrapper: Wrapper, name = 'Анна', phone = '+7 900 000-00-00') => {
  await wrapper.find('input[placeholder="Имя"]').setValue(name)
  await wrapper.find('input[placeholder="Телефон"]').setValue(phone)
}

const submitContact = async (wrapper: Wrapper) => {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('BookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListTypes.mockReturnValue([thirtyMinutes])
    mockedListDayStarts.mockImplementation(() => buildSlots())
    mockedCountFreeSlots.mockReturnValue(18)
  })

  it('asks to choose a type when there are no types at all', async () => {
    mockedListTypes.mockReturnValue([])
    const { wrapper } = await mountPage({})

    expect(wrapper.text()).toContain('Сначала выберите тип события')
  })

  it('falls back to the default type when the page is opened directly', async () => {
    const { wrapper } = await mountPage({})

    expect(wrapper.text()).toContain('Выберите дату в календаре.')

    await pickDate(wrapper)

    expect(mockedListDayStarts).toHaveBeenCalledWith(DATE, thirtyMinutes.durationMinutes)
    expect(wrapper.findAll('.slot')).toHaveLength(18)
  })

  it('starts with an empty information card and an unpickable «Продолжить»', async () => {
    const { wrapper } = await mountPage()

    expect(infoValues(wrapper)).toEqual([
      'Дата не выбрана',
      'Время не выбрано',
      '0',
      'Нет слотов на этот день',
    ])
    expect(wrapper.text()).toContain('Выберите дату в календаре.')
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('shows the day slots after picking a date', async () => {
    const { wrapper } = await mountPage()

    await pickDate(wrapper)

    expect(mockedListDayStarts).toHaveBeenCalledWith(DATE, 30)
    expect(wrapper.findAll('.slot')).toHaveLength(18)
    expect(wrapper.text()).toContain('09:00 - 09:30')
    expect(wrapper.text()).toContain('17:30 - 18:00')
    expect(infoValues(wrapper)).toEqual([
      'понедельник, 5 октября',
      'Время не выбрано',
      '18',
      '30 мин',
    ])
  })

  it('marks taken slots as busy and keeps them unpickable', async () => {
    mockedListDayStarts.mockImplementation(() => buildSlots(['09:00']))
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    const taken = slotWith(wrapper, '09:00')

    expect(taken.classes()).toContain('slot--taken')
    expect(taken.text()).toContain('Занято')

    await taken.trigger('click')

    expect(wrapper.findAll('.slot--selected')).toHaveLength(0)
  })

  it('enables «Продолжить» only after a slot is picked', async () => {
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()

    await slotWith(wrapper, '10:00').trigger('click')

    expect(continueButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.findAll('.slot--selected')).toHaveLength(1)
  })

  it('tells the visitor when the day has no free time left', async () => {
    mockedListDayStarts.mockImplementation(() => buildSlots(listStartTimes()))
    const { wrapper } = await mountPage()

    await pickDate(wrapper)

    expect(wrapper.text()).toContain('не осталось свободного времени')
    expect(wrapper.findAll('.slot')).toHaveLength(0)
  })

  it('tells the visitor when the event does not fit into the day at all', async () => {
    mockedListDayStarts.mockImplementation(() => [])
    const { wrapper } = await mountPage()

    await pickDate(wrapper)

    expect(wrapper.text()).toContain('не помещается целиком')
  })

  it('goes to the contact step and back', async () => {
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('Подтверждение записи')
    expect(wrapper.find('input[placeholder="Имя"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="Телефон"]').exists()).toBe(true)
    expect(infoValues(wrapper)).toContain('10:00 - 10:30')

    const backButton = wrapper.find('.back-button')
    expect(backButton.text()).toBe('Назад')

    await backButton.trigger('click')

    expect(wrapper.text()).toContain('Статус слотов')
  })

  it('returns to the type selection with «Назад»', async () => {
    const { wrapper, router } = await mountPage()

    await wrapper.findAll('.actions .el-button')[0]?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/events')
  })

  it('creates a booking and shows the confirmation details', async () => {
    const { wrapper } = await mountPage()
    mockedCreateBooking.mockReturnValue({
      id: 'bk-1',
      eventTypeId: thirtyMinutes.id,
      date: DATE,
      startTime: '10:00',
      contact: { name: 'Анна', phone: '+7 900 000-00-00' },
      status: 'active',
      createdAt: '2026-10-01T00:00:00.000Z',
    })

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')
    await fillContact(wrapper)
    await submitContact(wrapper)

    expect(mockedCreateBooking).toHaveBeenCalledWith({
      eventTypeId: thirtyMinutes.id,
      date: DATE,
      startTime: '10:00',
      contact: { name: 'Анна', phone: '+7 900 000-00-00' },
    })
    expect(wrapper.text()).toContain('Бронь подтверждена. До встречи!')
    expect(wrapper.text()).toContain('Встреча 30 минут')
    expect(wrapper.text()).toContain('05.10.2026')
    expect(wrapper.text()).toContain('10:00')
    expect(wrapper.text()).toContain('Анна')
    expect(wrapper.text()).toContain('+7 900 000-00-00')
  })

  it('starts a new booking after «Забронировать ещё»', async () => {
    const { wrapper } = await mountPage()
    mockedCreateBooking.mockReturnValue({
      id: 'bk-1',
      eventTypeId: thirtyMinutes.id,
      date: DATE,
      startTime: '10:00',
      contact: { name: 'Анна', phone: '+7 900 000-00-00' },
      status: 'active',
      createdAt: '2026-10-01T00:00:00.000Z',
    })

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')
    await fillContact(wrapper)
    await submitContact(wrapper)

    await wrapper.find('.submit-button').trigger('click')

    expect(wrapper.text()).toContain('Статус слотов')
    expect(infoValues(wrapper)[0]).toBe('Дата не выбрана')
  })

  it('does not submit without a contact', async () => {
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')
    await submitContact(wrapper)
    // Element Plus показывает текст ошибки через debounce (refDebounced, 100 мс).
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(mockedCreateBooking).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Введите имя')
  })

  it('rejects a too short phone next to the field', async () => {
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')
    await fillContact(wrapper, 'Анна', '123')
    await submitContact(wrapper)
    // Element Plus показывает текст ошибки через debounce (refDebounced, 100 мс).
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(mockedCreateBooking).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Проверьте телефон')
  })

  it('returns to the refreshed slots when the time is already taken', async () => {
    let conflicted = false
    mockedListDayStarts.mockImplementation(() => buildSlots(conflicted ? ['10:00'] : []))
    mockedCreateBooking.mockImplementation(() => {
      conflicted = true
      throw new Error('Это время уже занято. Выберите другое время.')
    })
    const { wrapper } = await mountPage()

    await pickDate(wrapper)
    await slotWith(wrapper, '10:00').trigger('click')
    await continueButton(wrapper).trigger('click')
    await fillContact(wrapper)
    await submitContact(wrapper)

    expect(wrapper.text()).toContain('Это время уже занято')
    expect(wrapper.text()).toContain('Статус слотов')
    expect(wrapper.findAll('.slot--selected')).toHaveLength(0)
    expect(slotWith(wrapper, '10:00').text()).toContain('Занято')
  })
})
