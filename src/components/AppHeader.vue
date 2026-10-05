<script setup lang="ts">
import { Calendar } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <el-header class="app-header">
    <div class="app-container app-header__inner">
      <RouterLink class="brand" to="/">
        <el-icon class="brand-icon" :size="28" color="var(--el-color-primary)">
          <Calendar />
        </el-icon>
        <span class="brand-name">Calendar</span>
      </RouterLink>
      <el-space :size="24" spacer-class="nav-links">
        <el-link underline="never" @click="router.push('/events')">Записаться</el-link>
        <el-link underline="never" @click="router.push('/upcoming')">Предстоящие события</el-link>
        <el-link underline="never" @click="router.push('/admin')">Настройки</el-link>
      </el-space>
    </div>
  </el-header>
</template>

<style scoped>
.app-header {
  height: var(--app-header-height);
  padding: 0 var(--app-gutter);
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.app-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
</style>
