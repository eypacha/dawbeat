import { createRouter, createWebHashHistory } from 'vue-router'
import DawView from '@/views/DawView.vue'
import CompanionView from '@/views/CompanionView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: DawView
    },
    {
      path: '/p/:id',
      component: DawView
    },
    {
      path: '/companion',
      component: CompanionView
    }
  ]
})

export default router
