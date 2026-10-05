import './assets/main.css'

import { createApp } from 'vue'

import { ensureDefaultEventTypes } from './api/eventTypes'
import App from './App.vue'
import router from './router'

ensureDefaultEventTypes()

createApp(App).use(router).mount('#app')
