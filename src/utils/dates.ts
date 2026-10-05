const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']

/** Дата из календаря — «05.10.2026». */
export const formatDate = (iso: string): string => {
  const [year = '', month = '', day = ''] = iso.split('-')
  return `${day}.${month}.${year}`
}

/** Дата из календаря словами — «понедельник, 5 октября». */
export const formatDayLabel = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`)
  const weekday = WEEKDAYS[(date.getDay() + 6) % 7] ?? ''
  return `${weekday}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}
