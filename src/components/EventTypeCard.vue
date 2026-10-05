<script setup lang="ts">
import type { EventType } from '@/api/types'

defineProps<{ eventType: EventType }>()
</script>

<template>
  <div class="type-card">
    <div class="type-head">
      <span class="type-name">{{ eventType.name }}</span>
      <el-tag class="type-duration" round type="info">{{ eventType.durationMinutes }} мин</el-tag>
    </div>
    <p class="type-description">{{ eventType.description }}</p>
  </div>
</template>

<style scoped>
.type-card {
  height: 100%;
  padding: 20px 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background-color: var(--el-bg-color);
}

.type-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.type-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.type-duration {
  flex: none;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.type-description {
  margin: 10px 0 0;
  color: var(--el-text-color-secondary);
}
</style>
