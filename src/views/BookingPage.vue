<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'

import { bookingWindowEnd, countFreeSlots, listDayStarts } from '@/api/availability'
import type { DaySlot } from '@/api/availability'
import { createBooking } from '@/api/bookings'
import { listEventTypes } from '@/api/eventTypes'
import { SLOT_MINUTES } from '@/api/slots'
import type { Booking, EventType } from '@/api/types'
import MonthCalendar from '@/components/MonthCalendar.vue'
import { formatDate, formatDayLabel } from '@/utils/dates'

const route = useRoute()
const router = useRouter()

const eventTypes = listEventTypes()
const defaultType = eventTypes[0]
// Тип события выбирается на предыдущем экране; при прямом заходе берём тип по умолчанию.
const eventType = computed<EventType | undefined>(
  () => eventTypes.find((type) => type.id === route.query.type) ?? defaultType,
)
const duration = computed(() => eventType.value?.durationMinutes ?? SLOT_MINUTES)

const step = ref<'slot' | 'contact' | 'done'>('slot')
const selectedDate = ref('')
const selectedStart = ref('')
const daySlots = ref<DaySlot[]>([])
const freeSlots = ref(0)
const submitError = ref('')
const confirmation = ref<Booking | null>(null)
// Дальше конца окна регистрации записываться некуда — календарь не листается.
const windowEnd = bookingWindowEnd()

const refreshSlots = () => {
  daySlots.value = selectedDate.value ? listDayStarts(selectedDate.value, duration.value) : []
  freeSlots.value = selectedDate.value ? countFreeSlots(selectedDate.value) : 0
}

watch([selectedDate, duration], () => {
  refreshSlots()
  if (
    selectedStart.value &&
    !daySlots.value.some((slot) => slot.startTime === selectedStart.value && slot.status === 'free')
  ) {
    selectedStart.value = ''
  }
})

const dateLabel = computed(() =>
  selectedDate.value ? formatDayLabel(selectedDate.value) : 'Дата не выбрана',
)

const timeLabel = computed(() => {
  const slot = daySlots.value.find((item) => item.startTime === selectedStart.value)
  return slot ? `${slot.startTime} - ${slot.endTime}` : 'Время не выбрано'
})

const durationLabel = computed(() =>
  selectedDate.value && daySlots.value.length > 0
    ? `${SLOT_MINUTES} мин`
    : 'Нет слотов на этот день',
)

const hasFreeStart = computed(() => daySlots.value.some((slot) => slot.status === 'free'))

const noRoomMessage = computed(() =>
  daySlots.value.length === 0
    ? 'На эту дату событие не помещается целиком. Выберите другой день.'
    : 'На эту дату не осталось свободного времени. Выберите другой день.',
)

const pickSlot = (slot: DaySlot) => {
  if (slot.status === 'taken') {
    return
  }
  selectedStart.value = slot.startTime
  submitError.value = ''
}

const formRef = ref<FormInstance>()
const form = reactive({ name: '', phone: '' })

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: 'Введите имя', trigger: 'blur' }],
  phone: [
    {
      validator: (_rule, value: string, callback) => {
        const phone = String(value ?? '').trim()
        if (!phone) {
          callback(new Error('Введите телефон'))
          return
        }
        if (phone.replace(/\D/g, '').length < 10) {
          callback(new Error('Проверьте телефон — минимум 10 цифр'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const goToContact = () => {
  if (selectedStart.value) {
    step.value = 'contact'
  }
}

const backToSlots = () => {
  step.value = 'slot'
}

const backToTypes = () => {
  router.push('/events')
}

const onSubmit = async () => {
  submitError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !eventType.value) {
    return
  }

  try {
    confirmation.value = createBooking({
      eventTypeId: eventType.value.id,
      date: selectedDate.value,
      startTime: selectedStart.value,
      contact: { name: form.name, phone: form.phone },
    })
    refreshSlots()
    step.value = 'done'
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : 'Не удалось записаться. Попробуйте ещё раз.'
    // Слот мог уйти, пока заполняли контакт: возвращаемся к обновлённому списку времени.
    selectedStart.value = ''
    refreshSlots()
    step.value = 'slot'
  }
}

const bookAgain = () => {
  selectedDate.value = ''
  selectedStart.value = ''
  confirmation.value = null
  submitError.value = ''
  form.name = ''
  form.phone = ''
  refreshSlots()
  step.value = 'slot'
}
</script>

<template>
  <el-main class="page">
    <div class="app-container">
      <h1 class="page-title">Запись на звонок</h1>

      <p v-if="!eventType" class="page-empty">
        Сначала выберите тип события на странице «Записаться».
      </p>

      <div v-else class="layout" :class="step === 'slot' ? 'layout--three' : 'layout--two'">
        <section class="card">
          <h2 class="card-title">Информация</h2>
          <div class="info-block">
            <span class="info-label">Выбранная дата</span>
            <span class="info-value">{{ dateLabel }}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Выбранное время</span>
            <span class="info-value">{{ timeLabel }}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Свободно</span>
            <span class="info-value">{{ freeSlots }}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Длительности в дне</span>
            <span class="info-value">{{ durationLabel }}</span>
          </div>
        </section>

        <template v-if="step === 'slot'">
          <section class="card">
            <MonthCalendar
              v-model="selectedDate"
              :counts="countFreeSlots"
              :window-end="windowEnd"
            />
          </section>

          <section class="card slots">
            <h2 class="card-title">Статус слотов</h2>

            <p v-if="!selectedDate" class="slots-empty">Выберите дату в календаре.</p>
            <p v-else-if="!hasFreeStart" class="slots-empty">{{ noRoomMessage }}</p>
            <ul v-else class="slot-list">
              <li v-for="slot in daySlots" :key="slot.startTime">
                <button
                  type="button"
                  class="slot"
                  :class="{
                    'slot--selected': slot.startTime === selectedStart,
                    'slot--taken': slot.status === 'taken',
                  }"
                  :disabled="slot.status === 'taken'"
                  @click="pickSlot(slot)"
                >
                  <span class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</span>
                  <span class="slot-status">
                    {{ slot.status === 'taken' ? 'Занято' : 'Свободно' }}
                  </span>
                </button>
              </li>
            </ul>

            <p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>

            <div class="actions">
              <el-button size="large" class="action" @click="backToTypes">Назад</el-button>
              <el-button
                size="large"
                type="primary"
                class="action"
                :disabled="!selectedStart"
                @click="goToContact"
              >
                Продолжить
              </el-button>
            </div>
          </section>
        </template>

        <section v-else-if="step === 'contact'" class="card">
          <div class="confirm-head">
            <h2 class="card-title">Подтверждение записи</h2>
            <el-button class="back-button" @click="backToSlots">Назад</el-button>
          </div>

          <el-form
            ref="formRef"
            class="contact-form"
            :model="form"
            :rules="rules"
            @submit.prevent="onSubmit"
          >
            <el-form-item prop="name">
              <el-input v-model="form.name" size="large" placeholder="Имя" />
            </el-form-item>
            <el-form-item prop="phone">
              <el-input v-model="form.phone" size="large" placeholder="Телефон" />
            </el-form-item>
            <p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>
            <el-button native-type="submit" size="large" type="primary" class="submit-button">
              Подтвердить запись
            </el-button>
          </el-form>
        </section>

        <section v-else class="card">
          <p class="done-title">Бронь подтверждена. До встречи!</p>
          <dl v-if="confirmation" class="done-list">
            <div class="done-row">
              <dt>Тип события</dt>
              <dd>{{ eventType.name }}</dd>
            </div>
            <div class="done-row">
              <dt>Дата</dt>
              <dd>{{ formatDate(confirmation.date) }}</dd>
            </div>
            <div class="done-row">
              <dt>Время</dt>
              <dd>{{ confirmation.startTime }}</dd>
            </div>
            <div class="done-row">
              <dt>Имя</dt>
              <dd>{{ confirmation.contact.name }}</dd>
            </div>
            <div class="done-row">
              <dt>Телефон</dt>
              <dd>{{ confirmation.contact.phone }}</dd>
            </div>
          </dl>
          <el-button size="large" type="primary" class="submit-button" @click="bookAgain">
            Забронировать ещё
          </el-button>
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

.page-empty {
  margin: 0;
  padding: 24px 28px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-secondary);
}

.layout {
  display: grid;
  gap: 24px;
}

.layout--three {
  grid-template-columns: 300px minmax(0, 1fr) 335px;
}

.layout--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.info-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
}

.info-block:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-value {
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.slot-list {
  max-height: 340px;
  margin: 0 0 16px;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  font: inherit;
  cursor: pointer;
}

.slot:hover:not(:disabled) {
  border-color: var(--el-color-primary);
}

.slot:disabled {
  cursor: default;
}

.slot-time {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.slot-status {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.slot--taken .slot-time,
.slot--taken .slot-status {
  font-weight: 400;
  color: var(--el-text-color-disabled);
}

.slot--selected {
  border-color: var(--el-color-primary);
}

.slot--selected .slot-time,
.slot--selected .slot-status {
  color: var(--el-color-primary);
}

.slots-empty {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.form-error {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 12px;
}

.actions .action {
  flex: 1;
}

.actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.confirm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.confirm-head .card-title {
  margin: 0;
}

.back-button {
  font-weight: 700;
}

/* Всплывающее снизу сообщение об ошибке поля рисуется поверх следующего поля,
   поэтому между полями нужен запас под него. */
.contact-form :deep(.el-form-item) {
  margin-bottom: 28px;
}

.submit-button {
  width: 100%;
  font-weight: 700;
}

.done-title {
  margin: 0 0 20px;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  color: var(--el-text-color-primary);
}

.done-list {
  margin: 0 0 20px;
  font-size: 14px;
}

.done-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}

.done-row dt {
  min-width: 130px;
  color: var(--el-text-color-secondary);
}

.done-row dd {
  margin: 0;
  color: var(--el-text-color-primary);
}

@media (max-width: 991px) {
  .layout--three,
  .layout--two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
