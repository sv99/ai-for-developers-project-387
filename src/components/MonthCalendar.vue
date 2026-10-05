<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Выбранная дата в формате YYYY-MM-DD; пустая строка — дата не выбрана. */
    modelValue: string
    /** Сколько единиц у дня: свободные Слоты на странице Записи, Записи — в журнале. */
    counts: (date: string) => number
    /** Единица в подписи дня: «N св.» на странице Записи, «N зап.» в журнале. */
    countSuffix?: string
    /** Подсвечивать фоном дни, у которых есть единицы: в журнале так видны дни с Записями. */
    highlightFull?: boolean
    /** Сегодняшняя дата; нужна только тестам. */
    today?: string
    /** Последний день окна регистрации; пустая строка — без ограничения. */
    windowEnd?: string
  }>(),
  { countSuffix: 'св.', highlightFull: false, today: '', windowEnd: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

const pad = (value: number) => String(value).padStart(2, '0')
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

const today = computed(() => {
  if (props.today) {
    return props.today
  }
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
})

const split = (iso: string) => {
  const [year = '0', month = '1', day = '1'] = iso.split('-')
  return { year: Number(year), month: Number(month) - 1, day: Number(day) }
}

const start = split(props.modelValue || today.value)
const viewYear = ref(start.year)
const viewMonth = ref(start.month)

const monthLabel = computed(() => `${MONTHS[viewMonth.value]} ${viewYear.value} г.`)

/** Номер месяца от начала лет — по нему сравниваются месяцы разных лет. */
const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1

const viewIndex = computed(() => viewYear.value * 12 + viewMonth.value)

const canGoBack = computed(() => viewIndex.value > monthIndex(today.value))
const canGoForward = computed(
  () => props.windowEnd === '' || viewIndex.value < monthIndex(props.windowEnd),
)

type DayCell = {
  iso: string
  day: number
  inMonth: boolean
  past: boolean
  /** День за окном регистрации — записаться на него нельзя. */
  beyond: boolean
  free: number
  /** День можно выбрать: он не прошёл, попадает в окно и имеет свободные Слоты. */
  available: boolean
}

const cells = computed<DayCell[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const total = Math.ceil((offset + daysInMonth) / 7) * 7

  return Array.from({ length: total }, (_value, index) => {
    const date = new Date(viewYear.value, viewMonth.value, 1 - offset + index)
    const iso = toIso(date.getFullYear(), date.getMonth(), date.getDate())
    const past = iso < today.value
    const beyond = props.windowEnd !== '' && iso > props.windowEnd
    const free = props.counts(iso)

    return {
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === viewMonth.value,
      past,
      beyond,
      free,
      available: !past && !beyond && free > 0,
    }
  })
})

const shiftMonth = (delta: number) => {
  if (delta < 0 ? !canGoBack.value : !canGoForward.value) {
    return
  }
  const next = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = next.getFullYear()
  viewMonth.value = next.getMonth()
}

const pick = (cell: DayCell) => {
  // Месяц переключают только кнопки листания: клик по дню соседнего месяца выбирает день,
  // не меняя вид календаря.
  if (!cell.available) {
    return
  }
  emit('update:modelValue', cell.iso)
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-head">
      <h2 class="calendar-title">Календарь</h2>
      <div class="calendar-nav">
        <button
          class="nav-button"
          type="button"
          aria-label="Предыдущий месяц"
          :disabled="!canGoBack"
          @click="shiftMonth(-1)"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <button
          class="nav-button"
          type="button"
          aria-label="Следующий месяц"
          :disabled="!canGoForward"
          @click="shiftMonth(1)"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </div>

    <p class="calendar-month">{{ monthLabel }}</p>

    <div class="calendar-weekdays">
      <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="calendar-grid">
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        class="day"
        :class="{
          'day--outside': !cell.inMonth,
          'day--muted': !cell.available,
          'day--has-items': highlightFull && cell.free > 0,
          'day--selected': cell.iso === modelValue,
          'day--today': cell.iso === today,
        }"
        :disabled="!cell.available"
        @click="pick(cell)"
      >
        <span class="day-number">{{ cell.day }}</span>
        <span v-if="!cell.past && !cell.beyond" class="day-count">
          {{ cell.free }} {{ countSuffix }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.calendar-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.calendar-nav {
  display: flex;
  gap: 8px;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-regular);
  cursor: pointer;
}

.nav-button:hover:not(:disabled) {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.nav-button:disabled {
  border-color: var(--el-border-color-lighter);
  color: var(--el-text-color-disabled);
  cursor: default;
}

.calendar-month {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-weekdays {
  margin-bottom: 8px;
  font-size: 13px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  aspect-ratio: 1 / 1;
  padding: 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  font: inherit;
  color: var(--el-text-color-primary);
  cursor: pointer;
}

.day--has-items {
  background-color: var(--el-color-primary-light-9);
}

.day--has-items .day-count {
  color: var(--el-color-primary-dark-2);
}

.day:hover:not(:disabled) {
  border-color: var(--el-color-primary);
}

.day:disabled {
  cursor: default;
}

.day-number {
  font-size: 15px;
  line-height: 1.2;
}

.day-count {
  font-size: 11px;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
}

/* Дни соседних месяцев не приглушаем отдельно: серыми остаются только дни вне окна
   регистрации и дни без свободных Слотов — это задаёт .day--muted. */
.day--muted .day-number,
.day--muted .day-count {
  color: var(--el-text-color-disabled);
}

.day--selected {
  border-color: var(--el-color-primary);
  box-shadow: inset 0 0 0 1px var(--el-color-primary);
}

.day--selected .day-number,
.day--today .day-number {
  font-weight: 700;
}

.day--selected .day-count {
  color: var(--el-color-primary);
}
</style>
