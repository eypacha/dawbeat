import { createRouter, createWebHashHistory } from 'vue-router'
import DawView from '@/views/DawView.vue'
import CompanionView from '@/views/CompanionView.vue'
import LandingView from '@/views/LandingView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: LandingView
    },
    {
      path: '/app',
      component: DawView
    },
    {
      path: '/app/p/:id',
      component: DawView
    },
    {
      path: '/app/companion',
      component: CompanionView
    },
    {
      path: '/p/:id',
      redirect: (to) => ({ path: `/app/p/${to.params.id}` })
    },
    {
      path: '/companion',
      redirect: { path: '/app/companion' }
    }
  ]
})

export default router
