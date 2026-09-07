<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { Profile } from '@/types/database.types'

defineProps<{
  users: Profile[]
  currentUserId: string | null
  isBusy?: boolean
}>()

const emit = defineEmits<{
  edit: [user: Profile]
  resetPassword: [user: Profile]
}>()

function roleLabel(role: Profile['role']): string {
  return role === 'admin' ? 'مدير' : 'كاشير'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-YE')
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
    <table class="min-w-[48rem] text-sm">
      <thead class="border-b border-slate-200/70 bg-slate-50/80 text-slate-600">
        <tr>
          <th class="px-3 py-2 text-start font-medium">الاسم</th>
          <th class="px-3 py-2 text-start font-medium">البريد</th>
          <th class="px-3 py-2 text-start font-medium">الدور</th>
          <th class="px-3 py-2 text-start font-medium">الحالة</th>
          <th class="px-3 py-2 text-start font-medium">تاريخ الإضافة</th>
          <th class="px-3 py-2 text-start font-medium">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="users.length === 0">
          <td colspan="6" class="px-4 py-10 text-center text-slate-400">
            لا يوجد مستخدمون بعد
          </td>
        </tr>
        <tr
          v-for="user in users"
          :key="user.id"
          class="border-b border-slate-100 last:border-0"
        >
          <td class="px-3 py-2 font-medium text-slate-900">
            {{ user.full_name }}
            <span
              v-if="user.id === currentUserId"
              class="ms-1 text-[11px] font-normal text-slate-400"
            >
              (أنت)
            </span>
          </td>
          <td class="px-3 py-2 text-slate-600" dir="ltr">
            {{ user.email || '—' }}
          </td>
          <td class="px-3 py-2">
            <AppBadge :variant="user.role === 'admin' ? 'default' : 'muted'">
              {{ roleLabel(user.role) }}
            </AppBadge>
          </td>
          <td class="px-3 py-2">
            <AppBadge :variant="user.is_active ? 'success' : 'warning'">
              {{ user.is_active ? 'نشط' : 'موقوف' }}
            </AppBadge>
          </td>
          <td class="px-3 py-2 text-slate-600">
            {{ formatDate(user.created_at) }}
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                :disabled="isBusy"
                @click="emit('edit', user)"
              >
                تعديل
              </button>
              <button
                type="button"
                class="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
                :disabled="isBusy"
                @click="emit('resetPassword', user)"
              >
                كلمة المرور
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
