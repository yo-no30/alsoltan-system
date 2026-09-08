import type { Component } from 'vue'
import {
  Home,
  ShoppingCart,
  Package,
  FileText,
  Handshake,
  Users,
  UserCog,
  BarChart3,
  BookOpen,
  Receipt,
} from '@lucide/vue'

export type NavGroup = 'ops' | 'backoffice'

export interface AppNavItem {
  to: string
  label: string
  description: string
  icon: Component
  adminOnly?: boolean
  group: NavGroup
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    to: '/home',
    label: 'الرئيسية',
    description: 'لوحة الوصول السريع لكل الشاشات',
    icon: Home,
    group: 'ops',
  },
  {
    to: '/pos',
    label: 'نقطة البيع',
    description: 'بيع المنتجات وإصدار الفواتير',
    icon: ShoppingCart,
    group: 'ops',
  },
  {
    to: '/inventory',
    label: 'المنتجات والمخزون',
    description: 'إدارة الأصناف والكميات والأقسام',
    icon: Package,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/purchases',
    label: 'المشتريات',
    description: 'تسجيل فواتير الشراء والموردين',
    icon: FileText,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/suppliers',
    label: 'الموردين',
    description: 'بيانات الموردين والذمم',
    icon: Handshake,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/customers',
    label: 'العملاء',
    description: 'بيانات العملاء والمبيعات الآجلة',
    icon: Users,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/users',
    label: 'المستخدمون',
    description: 'حسابات المستخدمين والصلاحيات',
    icon: UserCog,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/accounting',
    label: 'المحاسبة',
    description: 'شجرة الحسابات والقيود والتقارير المالية',
    icon: BookOpen,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/operating-expenses',
    label: 'المصاريف التشغيلية',
    description: 'تسجيل وعرض مصاريف التشغيل من الصندوق أو البنك',
    icon: Receipt,
    adminOnly: true,
    group: 'backoffice',
  },
  {
    to: '/reports',
    label: 'التقارير والأرباح',
    description: 'المبيعات والأرباح وتقارير المخزون',
    icon: BarChart3,
    adminOnly: true,
    group: 'backoffice',
  },
]

export function filterNavItems(
  items: AppNavItem[],
  isAdmin: boolean,
): AppNavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin)
}

export function labelForPath(path: string): string {
  if (path.startsWith('/accounting')) {
    return 'المحاسبة'
  }
  const exact = APP_NAV_ITEMS.find((item) => item.to === path)
  if (exact) return exact.label
  const partial = APP_NAV_ITEMS.find(
    (item) => item.to !== '/home' && path.startsWith(`${item.to}/`),
  )
  return partial?.label ?? 'الصفحة'
}

export type BreadcrumbCrumb = {
  label: string
  to?: string
}

export function breadcrumbsForPath(path: string): BreadcrumbCrumb[] {
  if (path === '/home' || path === '/') {
    return [{ label: 'الرئيسية' }]
  }

  return [
    { label: 'الرئيسية', to: '/home' },
    { label: labelForPath(path) },
  ]
}
