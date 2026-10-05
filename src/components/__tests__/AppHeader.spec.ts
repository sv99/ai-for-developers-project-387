import { describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import AdminPage from '@/views/AdminPage.vue'
import BookingPage from '@/views/BookingPage.vue'
import EventsPage from '@/views/EventsPage.vue'
import LandingPage from '@/views/LandingPage.vue'
import UpcomingPage from '@/views/UpcomingPage.vue'

import AppHeader from '../AppHeader.vue'

const mountHeader = () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: LandingPage },
      { path: '/events', component: EventsPage },
      { path: '/booking', component: BookingPage },
      { path: '/upcoming', component: UpcomingPage },
      { path: '/admin', component: AdminPage },
    ],
  })
  const wrapper = mount(AppHeader, { global: { plugins: [router] } })
  return { wrapper, router }
}

const clickLink = async (wrapper: ReturnType<typeof mountHeader>['wrapper'], text: string) => {
  const link = wrapper.findAll('.el-link').find((item) => item.text() === text)
  if (!link) throw new Error(`Ссылка «${text}» не найдена`)
  await link.trigger('click')
  await flushPromises()
}

describe('AppHeader', () => {
  it('leads to the type choice from the «Записаться» link', async () => {
    const { wrapper, router } = mountHeader()
    await router.isReady()
    await clickLink(wrapper, 'Записаться')
    expect(router.currentRoute.value.path).toBe('/events')
  })

  it('leads to the owner journal from the «Предстоящие события» link', async () => {
    const { wrapper, router } = mountHeader()
    await router.isReady()
    await clickLink(wrapper, 'Предстоящие события')
    expect(router.currentRoute.value.path).toBe('/upcoming')
  })

  it('leads to the settings from the «Настройки» link', async () => {
    const { wrapper, router } = mountHeader()
    await router.isReady()
    await clickLink(wrapper, 'Настройки')
    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
