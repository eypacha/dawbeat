import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from '@/router'
import { setupProjectPersistence } from '@/services/projectPersistence'
import { useDawStore } from '@/stores/dawStore'

const app = createApp(App)
const pinia = createPinia()

const isCompanionRoute = typeof window !== 'undefined' && window.location.hash.startsWith('#/companion')

if (!isCompanionRoute) {
  const dawStore = useDawStore(pinia)
  setupProjectPersistence(dawStore)
}

app.use(pinia)
app.use(router)
app.mount('#app')
