import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { homePathForRole, useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/toast'

declare module 'vue-router' {
  interface RouteMeta {
    layout?: 'blank'
    guest?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'blank', guest: true },
  },
  {
    path: '/auth',
    redirect: '/login',
  },
  {
    path: '/',
    redirect: '/pos',
  },
  {
    path: '/pos',
    name: 'pos',
    component: () => import('@/views/PosView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/views/InventoryView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/purchases',
    name: 'purchases',
    component: () => import('@/views/PurchasesView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/suppliers',
    name: 'suppliers',
    component: () => import('@/views/SuppliersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/CustomersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/views/ReportsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

async function ensureAuthReady(): Promise<void> {
  const auth = useAuthStore()
  if (!auth.isReady) {
    await auth.initialize()
  }
}

router.beforeEach(async (to: RouteLocationNormalized) => {
  const auth = useAuthStore()
  await ensureAuthReady()

  const isAuthenticated = auth.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    }
  }

  if (to.meta.guest && isAuthenticated) {
    return homePathForRole(auth.role)
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    const toast = useToast()
    toast.warning('ليس لديك صلاحية للوصول إلى هذه الصفحة')
    return '/pos'
  }

  return true
})

export default router
