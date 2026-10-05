<script setup lang="ts">
import { User } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { listEventTypes } from '@/api/eventTypes'
import { getCalendarName } from '@/api/settings'
import type { EventType } from '@/api/types'
import EventTypeCard from '@/components/EventTypeCard.vue'

const router = useRouter()
const eventTypes = ref<EventType[]>(listEventTypes())
const calendarName = getCalendarName()

const choose = (eventType: EventType) => {
  router.push({ path: '/booking', query: { type: eventType.id } })
}
</script>

<template>
  <el-main class="page">
    <div class="app-container">
      <section class="host-card">
        <div class="host">
          <span class="host-avatar">
            <el-icon :size="26" color="var(--el-color-primary)"><User /></el-icon>
          </span>
          <span class="host-meta">
            <span class="host-name">{{ calendarName }}</span>
            <span class="host-role">Владелец календаря</span>
          </span>
        </div>
        <h1 class="page-title">Выберите тип события</h1>
        <p class="page-text">
          Нажмите на карточку, чтобы открыть календарь и выбрать удобный слот.
        </p>
      </section>

      <p v-if="eventTypes.length === 0" class="page-empty">
        Пока нет ни одного типа событий. Владелец календаря может создать их в разделе «Предстоящие
        события».
      </p>
      <ul v-else class="type-list">
        <li v-for="eventType in eventTypes" :key="eventType.id">
          <EventTypeCard
            class="type-card--selectable"
            :event-type="eventType"
            role="button"
            tabindex="0"
            @click="choose(eventType)"
            @keydown.enter.prevent="choose(eventType)"
          />
        </li>
      </ul>
    </div>
  </el-main>
</template>

<style scoped>
.page {
  min-height: calc(100vh - var(--app-header-height));
  padding: 48px 24px;
  background-color: var(--el-fill-color-light);
}

.host-card {
  margin-bottom: 24px;
  padding: 28px 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 16px;
  background-color: var(--el-bg-color);
}

.host {
  display: flex;
  align-items: center;
  gap: 14px;
}

.host-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background-color: var(--el-fill-color-light);
}

.host-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.host-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.host-role {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.page-title {
  margin: 20px 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.page-text {
  margin: 0;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.page-empty {
  margin: 0;
  padding: 24px 28px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-secondary);
}

.type-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.type-card--selectable {
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.type-card--selectable:hover,
.type-card--selectable:focus-visible {
  box-shadow: var(--el-box-shadow-light);
}
</style>
