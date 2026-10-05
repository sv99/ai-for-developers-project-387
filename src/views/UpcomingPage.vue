<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

import { cancelBooking, listUpcomingBookings } from '@/api/bookings'
import { listEventTypes } from '@/api/eventTypes'
import { bookingRange, SLOT_MINUTES, toTime } from '@/api/slots'
import type { Booking } from '@/api/types'
import MonthCalendar from '@/components/MonthCalendar.vue'
import { formatDate, formatDayLabel } from '@/utils/dates'

const bookings = ref<Booking[]>(listUpcomingBookings())
const typesById = new Map(listEventTypes().map((type) => [type.id, type]))

const typeName = (id: string) => typesById.get(id)?.name ?? 'Тип события'

const timeRange = (booking: Booking) => {
  const duration = typesById.get(booking.eventTypeId)?.durationMinutes ?? SLOT_MINUTES
  return `${booking.startTime} - ${toTime(bookingRange(booking.startTime, duration).end)}`
}

const selectedDate = ref('')
const selectedId = ref('')
const cancelError = ref('')

const countByDate = computed(() => {
  const counts = new Map<string, number>()
  for (const booking of bookings.value) {
    counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1)
  }
  return counts
})

const countBookings = (date: string) => countByDate.value.get(date) ?? 0

const dayBookings = computed(() =>
  bookings.value.filter((booking) => booking.date === selectedDate.value),
)

const selectedBooking = computed(
  () => dayBookings.value.find((booking) => booking.id === selectedId.value) ?? null,
)

const pickDate = (date: string) => {
  selectedDate.value = date
  selectedId.value = ''
  cancelError.value = ''
}

const pickBooking = (booking: Booking) => {
  selectedId.value = booking.id
  cancelError.value = ''
}

const cancel = () => {
  cancelError.value = ''
  try {
    cancelBooking(selectedId.value)
  } catch (error) {
    cancelError.value = error instanceof Error ? error.message : 'Не удалось отменить Запись'
    return
  }
  bookings.value = listUpcomingBookings()
  selectedId.value = ''
}
</script>

<template>
  <el-main class="page">
    <div class="app-container">
      <h1 class="page-title">Предстоящие события</h1>

      <div class="layout">
        <section class="card">
          <MonthCalendar
            :model-value="selectedDate"
            :counts="countBookings"
            count-suffix="зап."
            highlight-full
            @update:model-value="pickDate"
          />
        </section>

        <section class="card">
          <h2 class="card-title">Записи дня</h2>

          <p v-if="bookings.length === 0" class="empty">
            Предстоящих Записей пока нет. Как только посетитель запишется, звонок появится здесь.
          </p>
          <p v-else-if="!selectedDate" class="empty">Выберите дату в календаре.</p>
          <template v-else>
            <p class="day-label">{{ formatDayLabel(selectedDate) }}</p>
            <ul class="booking-list">
              <li v-for="booking in dayBookings" :key="booking.id">
                <button
                  type="button"
                  class="booking"
                  :class="{ 'booking--selected': booking.id === selectedId }"
                  @click="pickBooking(booking)"
                >
                  <span class="booking-time">{{ timeRange(booking) }}</span>
                  <span class="booking-type">{{ typeName(booking.eventTypeId) }}</span>
                  <span class="booking-contact">
                    {{ booking.contact.name }}, {{ booking.contact.phone }}
                  </span>
                </button>
              </li>
            </ul>
          </template>
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Информация о записи</h2>

            <el-popconfirm
              v-if="selectedBooking"
              title="Отменить эту Запись?"
              confirm-button-text="Да, отменить"
              cancel-button-text="Нет"
              confirm-button-type="danger"
              width="240"
              @confirm="cancel"
            >
              <template #reference>
                <el-button class="remove-button" text circle aria-label="Удалить запись">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>

          <p v-if="!selectedBooking" class="empty">Выберите Запись в списке.</p>
          <template v-else>
            <dl class="details">
              <div class="details-row">
                <dt>Тип события</dt>
                <dd>{{ typeName(selectedBooking.eventTypeId) }}</dd>
              </div>
              <div class="details-row">
                <dt>Дата</dt>
                <dd>{{ formatDate(selectedBooking.date) }}</dd>
              </div>
              <div class="details-row">
                <dt>Время</dt>
                <dd>{{ timeRange(selectedBooking) }}</dd>
              </div>
              <div class="details-row">
                <dt>Имя</dt>
                <dd>{{ selectedBooking.contact.name }}</dd>
              </div>
              <div class="details-row">
                <dt>Телефон</dt>
                <dd>{{ selectedBooking.contact.phone }}</dd>
              </div>
            </dl>
            <p v-if="cancelError" class="form-error" role="alert">{{ cancelError }}</p>
          </template>
        </section>
      </div>
    </div>
  </el-main>
</template>

<style scoped>
.page {
  min-height: calc(100vh - var(--app-header-height));
  padding: 40px 24px;
  background-color: var(--el-fill-color-light);
}

.page-title {
  margin: 0 0 24px;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px 320px;
  gap: 24px;
}

.card {
  padding: 20px 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background-color: var(--el-bg-color);
}

.card-title {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

/* Шапка карточки с действием: заголовок слева, кнопки — справа. */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-head .card-title {
  margin: 0;
}

.remove-button {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}

.remove-button:hover:not(.is-disabled) {
  color: var(--el-color-danger);
}

.form-error {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--el-color-danger);
}

.empty {
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.day-label {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.booking-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.booking {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.booking:hover {
  border-color: var(--el-color-primary);
}

.booking--selected {
  border-color: var(--el-color-primary);
  box-shadow: inset 0 0 0 1px var(--el-color-primary);
}

.booking-time {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.booking-type {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.booking-contact {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.details {
  margin: 0;
  font-size: 14px;
}

.details-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}

.details-row dt {
  min-width: 110px;
  color: var(--el-text-color-secondary);
}

.details-row dd {
  margin: 0;
  color: var(--el-text-color-primary);
}

@media (max-width: 991px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
