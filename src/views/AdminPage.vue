<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import { createEventType, listEventTypes } from '@/api/eventTypes'
import { getCalendarName, setCalendarName } from '@/api/settings'
import type { EventType } from '@/api/types'
import EventTypeCard from '@/components/EventTypeCard.vue'

const nameRef = ref<FormInstance>()
const nameForm = reactive({ calendarName: getCalendarName() })
const nameRules: FormRules = {
  calendarName: [
    { required: true, whitespace: true, message: 'Введите имя календаря', trigger: 'blur' },
  ],
}
const nameSaved = ref(false)
const nameError = ref('')

const onSaveName = async () => {
  nameSaved.value = false
  nameError.value = ''
  const valid = await nameRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  try {
    setCalendarName(nameForm.calendarName)
  } catch (error) {
    nameError.value = error instanceof Error ? error.message : 'Не удалось сохранить имя'
    return
  }
  nameForm.calendarName = getCalendarName()
  nameSaved.value = true
}

const eventTypes = ref<EventType[]>(listEventTypes())
const typeError = ref('')

const typeRef = ref<FormInstance>()
const typeForm = reactive<{
  name: string
  description: string
  durationMinutes: number | undefined
}>({ name: '', description: '', durationMinutes: 30 })
const typeRules: FormRules = {
  name: [
    { required: true, whitespace: true, message: 'Введите название типа события', trigger: 'blur' },
  ],
  durationMinutes: [
    { required: true, message: 'Укажите длительность в минутах', trigger: 'change' },
  ],
}

const onAddType = async () => {
  typeError.value = ''
  const valid = await typeRef.value?.validate().catch(() => false)
  if (!valid || !typeForm.durationMinutes) {
    return
  }
  try {
    createEventType({
      name: typeForm.name,
      description: typeForm.description,
      durationMinutes: typeForm.durationMinutes,
    })
  } catch (error) {
    typeError.value = error instanceof Error ? error.message : 'Не удалось создать тип события'
    return
  }
  typeRef.value?.resetFields()
  eventTypes.value = listEventTypes()
}
</script>

<template>
  <el-main class="page">
    <div class="app-container">
      <h1 class="page-title">Настройки</h1>

      <el-card class="card" shadow="never">
        <template #header>
          <span class="card-title">Календарь</span>
        </template>
        <el-form
          ref="nameRef"
          class="form form--calendar"
          :model="nameForm"
          :rules="nameRules"
          label-position="top"
          @submit.prevent="onSaveName"
        >
          <el-form-item label="Имя календаря" prop="calendarName">
            <el-input v-model="nameForm.calendarName" placeholder="Имя календаря" />
          </el-form-item>
          <p v-if="nameError" class="form-error" role="alert">{{ nameError }}</p>
          <p v-if="nameSaved" class="form-success" role="status">Имя календаря сохранено.</p>
          <el-button native-type="submit" type="primary">Сохранить</el-button>
        </el-form>
      </el-card>

      <el-card class="card" shadow="never">
        <template #header>
          <span class="card-title">Типы событий</span>
        </template>

        <p v-if="eventTypes.length === 0" class="empty">Пока нет ни одного типа событий.</p>
        <ul v-else class="type-list">
          <li v-for="eventType in eventTypes" :key="eventType.id">
            <EventTypeCard :event-type="eventType" />
          </li>
        </ul>

        <el-form
          ref="typeRef"
          class="form form--types"
          :model="typeForm"
          :rules="typeRules"
          label-position="top"
          @submit.prevent="onAddType"
        >
          <el-form-item label="Название" prop="name">
            <el-input v-model="typeForm.name" placeholder="Название" />
          </el-form-item>
          <el-form-item label="Описание" prop="description">
            <el-input v-model="typeForm.description" placeholder="Описание" />
          </el-form-item>
          <el-form-item label="Длительность (минуты)" prop="durationMinutes">
            <el-input-number v-model="typeForm.durationMinutes" :min="1" :precision="0" />
          </el-form-item>
          <p v-if="typeError" class="form-error" role="alert">{{ typeError }}</p>
          <el-button native-type="submit" type="primary">Добавить тип</el-button>
        </el-form>
      </el-card>
    </div>
  </el-main>
</template>

<style scoped>
.page {
  padding: 40px var(--app-gutter);
}

.page-title {
  margin: 0 0 24px;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.card {
  --el-card-border-color: var(--el-border-color);

  max-width: 640px;
  margin-bottom: 24px;
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.form {
  max-width: 480px;
}

.form-error {
  margin: 0 0 16px;
  color: var(--el-color-danger);
}

.form-success {
  margin: 0 0 16px;
  color: var(--el-color-success);
}

.empty {
  margin: 0 0 24px;
  color: var(--el-text-color-secondary);
}

.type-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}
</style>
