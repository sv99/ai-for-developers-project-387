import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import MonthCalendar from '../MonthCalendar.vue'

const TODAY = '2026-03-28'

/** Прибавляет дни к дате в формате YYYY-MM-DD. */
const plusDays = (iso: string, days: number) => {
  const [year = '2026', month = '1', day = '1'] = iso.split('-')
  const date = new Date(Number(year), Number(month) - 1, Number(day) + days)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const mountCalendar = (props: Record<string, unknown> = {}) => {
  const today = typeof props.today === 'string' && props.today ? props.today : TODAY
  return mount(MonthCalendar, {
    // По умолчанию окно регистрации открыто на 14 дней вперёд от today.
    props: { modelValue: '', counts: () => 18, today, windowEnd: plusDays(today, 14), ...props },
  })
}

const dayInMonth = (wrapper: ReturnType<typeof mountCalendar>, number: number) =>
  wrapper
    .findAll('.day:not(.day--outside)')
    .find((cell) => cell.find('.day-number').text() === String(number))

describe('MonthCalendar', () => {
  it('shows the month, the weekday header and six weeks of days', () => {
    const wrapper = mountCalendar()

    expect(wrapper.find('.calendar-month').text()).toBe('март 2026 г.')
    expect(wrapper.findAll('.calendar-weekdays span').map((span) => span.text())).toEqual([
      'Пн',
      'Вт',
      'Ср',
      'Чт',
      'Пт',
      'Сб',
      'Вс',
    ])
    expect(wrapper.findAll('.day')).toHaveLength(42)
    expect(wrapper.findAll('.day--outside')).toHaveLength(11)
  })

  it('shows the free slots count for today and future days only', () => {
    const wrapper = mountCalendar()

    expect(wrapper.findAll('.day-count')).toHaveLength(9)
    expect(dayInMonth(wrapper, 28)?.find('.day-count').text()).toBe('18 св.')
    expect(dayInMonth(wrapper, 27)?.find('.day-count').exists()).toBe(false)
    expect(dayInMonth(wrapper, 27)?.classes()).toContain('day--muted')
  })

  it('renders a five week month and counts its trailing days', () => {
    const wrapper = mountCalendar({ today: '2026-09-30' })

    expect(wrapper.find('.calendar-month').text()).toBe('сентябрь 2026 г.')
    expect(wrapper.findAll('.day')).toHaveLength(35)
    expect(wrapper.findAll('.day-count')).toHaveLength(5)
    expect(wrapper.findAll('.day-count').map((item) => item.text())).toEqual([
      '18 св.',
      '18 св.',
      '18 св.',
      '18 св.',
      '18 св.',
    ])
  })

  it('emits the picked date', async () => {
    const wrapper = mountCalendar()

    await dayInMonth(wrapper, 30)?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-03-30']])
  })

  it('does not pick a past day', async () => {
    const wrapper = mountCalendar()

    await dayInMonth(wrapper, 27)?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not pick a day without free slots', async () => {
    const wrapper = mountCalendar({ counts: (date: string) => (date === '2026-03-30' ? 0 : 18) })

    await dayInMonth(wrapper, 30)?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('marks the selected day', () => {
    const wrapper = mountCalendar({ modelValue: '2026-03-30' })

    expect(dayInMonth(wrapper, 30)?.classes()).toContain('day--selected')
  })

  it('marks today apart from the other days', () => {
    const wrapper = mountCalendar()

    expect(dayInMonth(wrapper, 28)?.classes()).toContain('day--today')
    expect(dayInMonth(wrapper, 27)?.classes()).not.toContain('day--today')
    expect(dayInMonth(wrapper, 30)?.classes()).not.toContain('day--today')
  })

  it('moves to the next and previous month', async () => {
    const wrapper = mountCalendar()

    await wrapper.findAll('.nav-button')[1]?.trigger('click')
    expect(wrapper.find('.calendar-month').text()).toBe('апрель 2026 г.')

    await wrapper.findAll('.nav-button')[0]?.trigger('click')
    expect(wrapper.find('.calendar-month').text()).toBe('март 2026 г.')
  })

  it('locks the months outside the booking window', async () => {
    const wrapper = mountCalendar()
    const disabled = () =>
      wrapper.findAll('.nav-button').map((button) => button.attributes('disabled') !== undefined)

    // Сегодня 28 марта, окно открыто до 11 апреля: назад некуда, вперёд можно.
    expect(disabled()).toEqual([true, false])

    await wrapper.findAll('.nav-button')[1]?.trigger('click')

    expect(wrapper.find('.calendar-month').text()).toBe('апрель 2026 г.')
    expect(disabled()).toEqual([false, true])
  })

  it('locks both month buttons while the window fits into one month', () => {
    // Сегодня 5 марта, окно закрывается 19 марта — весь он в одном месяце.
    const wrapper = mountCalendar({ today: '2026-03-05' })

    expect(
      wrapper.findAll('.nav-button').map((button) => button.attributes('disabled') !== undefined),
    ).toEqual([true, true])
  })

  it('mutes the days beyond the booking window', async () => {
    // Сегодня 5 марта, окно закрывается 19 марта.
    const wrapper = mountCalendar({ today: '2026-03-05' })

    const lastDay = dayInMonth(wrapper, 19)
    const beyondDay = dayInMonth(wrapper, 20)

    expect(lastDay?.classes()).not.toContain('day--muted')
    expect(lastDay?.find('.day-count').text()).toBe('18 св.')
    expect(beyondDay?.classes()).toContain('day--muted')
    expect(beyondDay?.find('.day-count').exists()).toBe(false)

    await beyondDay?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps the days of the booking window active in the neighbouring month', async () => {
    // Сегодня 30 сентября, окно открыто до 14 октября: сентябрьский хвост ещё доступен.
    const wrapper = mountCalendar({ today: '2026-09-30' })

    await wrapper.findAll('.nav-button')[1]?.trigger('click')
    expect(wrapper.find('.calendar-month').text()).toBe('октябрь 2026 г.')

    const sept30 = wrapper.findAll('.day').find((cell) => cell.find('.day-number').text() === '30')

    // День из окна регистрации не приглушается, даже если он из соседнего месяца.
    expect(sept30?.classes()).not.toContain('day--muted')
    expect(sept30?.find('.day-count').text()).toBe('18 св.')

    await sept30?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-09-30']])
  })

  it('picks a day of the neighbouring month without switching the month', async () => {
    // Сегодня 30 сентября, окно открыто до 14 октября: 1 октября доступен как день соседнего месяца.
    const wrapper = mountCalendar({ today: '2026-09-30' })

    const oct1 = wrapper
      .findAll('.day')
      .find(
        (cell) =>
          cell.classes().includes('day--outside') && cell.find('.day-number').text() === '1',
      )
    expect(oct1?.classes()).not.toContain('day--muted')

    await oct1?.trigger('click')
    // Родитель сообщает выбранную дату обратно — компонент не должен из-за этого листать месяц.
    await wrapper.setProps({ modelValue: '2026-10-01' })

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-10-01']])
    expect(wrapper.find('.calendar-month').text()).toBe('сентябрь 2026 г.')
  })

  it('does not switch the month when the selection comes from outside', async () => {
    const wrapper = mountCalendar({ modelValue: '2026-03-30' })

    await wrapper.setProps({ modelValue: '2026-05-04' })

    expect(wrapper.find('.calendar-month').text()).toBe('март 2026 г.')
    expect(dayInMonth(wrapper, 30)?.classes()).not.toContain('day--selected')
  })

  it('labels the day count with the given suffix', () => {
    const wrapper = mountCalendar({ countSuffix: 'зап.' })

    expect(dayInMonth(wrapper, 28)?.find('.day-count').text()).toBe('18 зап.')
  })

  it('highlights the days that have items', () => {
    const wrapper = mountCalendar({
      highlightFull: true,
      counts: (date: string) => (date === '2026-03-30' ? 2 : 0),
    })

    expect(dayInMonth(wrapper, 30)?.classes()).toContain('day--has-items')
    expect(dayInMonth(wrapper, 29)?.classes()).not.toContain('day--has-items')
  })

  it('does not highlight the days while the highlight is off', () => {
    const wrapper = mountCalendar()

    expect(wrapper.findAll('.day--has-items')).toHaveLength(0)
  })
})
