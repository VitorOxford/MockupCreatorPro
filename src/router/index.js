// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from '@/views/WorkspaceView.vue'
import AuthView from '@/views/AuthView.vue'
import AccountView from '@/views/AccountView.vue' // Importa a nova view
import { supabase } from '@/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'workspace',
      component: WorkspaceView,
      meta: { requiresAuth: true },
    },
    // NOVA ROTA
    {
      path: '/account',
      name: 'account',
      component: AccountView,
      meta: { requiresAuth: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !session) {
    next({ name: 'auth' })
  } else if (!requiresAuth && session) {
    next({ name: 'workspace' })
  } else {
    next()
  }
})

export default router
