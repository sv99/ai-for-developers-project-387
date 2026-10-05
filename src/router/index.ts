import { createRouter, createWebHistory } from 'vue-router'

import LandingPage from '@/views/LandingPage.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/events', name: 'events', component: () => import('@/views/EventsPage.vue') },
    { path: '/booking', name: 'booking', component: () => import('@/views/BookingPage.vue') },
    { path: '/upcoming', name: 'upcoming', component: () => import('@/views/UpcomingPage.vue') },
    { path: '/admin', name: 'admin', component: () => import('@/views/AdminPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
