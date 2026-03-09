import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { setupProjectPersistence } from '@/services/projectPersistence'
import { useDawStore } from '@/stores/dawStore'

const app = createApp(App)
const pinia = createPinia()
const dawStore = useDawStore(pinia)

setupProjectPersistence(dawStore)

app.use(pinia)
app.mount('#app')
