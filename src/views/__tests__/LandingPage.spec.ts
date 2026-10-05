import { describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import BookingPage from '../BookingPage.vue'
import EventsPage from '../EventsPage.vue'
import LandingPage from '../LandingPage.vue'
import UpcomingPage from '../UpcomingPage.vue'

const mountLanding = () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: LandingPage },
      { path: '/events', component: EventsPage },
      { path: '/booking', component: BookingPage },
      { path: '/upcoming', component: UpcomingPage },
    ],
  })
  const wrapper = mount(LandingPage, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('LandingPage', () => {
  it('renders the brand and hero heading', () => {
    const { wrapper } = mountLanding()
    expect(wrapper.text()).toContain('Calendar')
    expect(wrapper.text()).toContain('Один экран, понятные слоты')
  })

  it('renders the features card', () => {
    const { wrapper } = mountLanding()
    expect(wrapper.text()).toContain('Что доступно прямо сейчас')
    expect(wrapper.text()).toContain('30-минутные слоты')
  })

  it('leads to the type choice from the hero button', async () => {
    const { wrapper, router } = mountLanding()
    await router.isReady()
    await wrapper.find('.hero-button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/events')
  })
})
