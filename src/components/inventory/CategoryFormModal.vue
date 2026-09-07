<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Category } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  categories: Category[]
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [name: string]
  update: [id: string, name: string]
}>()

const editingId = ref<string | null>(null)
const form = reactive({ name: '' })
const error = ref('')

const title = computed(() =>
  editingId.value ? 'تعديل قسم' : 'إضافة / إدارة الأقسام',
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      editingId.value = null
      form.name = ''
      error.value = ''
    }
  },
)

function startEdit(category: Category): void {
  editingId.value = category.id
  form.name = category.name
  error.value = ''
}

function cancelEdit(): void {
  editingId.value = null
  form.name = ''
  error.value = ''
}

function onSubmit(): void {
  const name = form.name.trim()
  if (!name) {
    error.value = 'اسم القسم مطلوب'
    return
  }
  error.value = ''

  if (editingId.value) {
    emit('update', editingId.value, name)
    return
  }
  emit('create', name)
}
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <div class="space-y-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">اسم القسم</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="مثال: مشروبات غازية"
        />
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
      </div>

      <div class="rounded-xl border border-slate-200/70">
        <div
          v-if="categories.length === 0"
          class="px-4 py-6 text-center text-sm text-slate-400"
        >
          لا توجد أقسام بعد
        </div>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50"
          @click="startEdit(category)"
        >
          <span class="font-medium text-slate-800">{{ category.name }}</span>
          <span class="text-xs text-slate-400">تعديل</span>
        </button>
      </div>
    </div>

    <template #footer>
      <button
        v-if="editingId"
        type="button"
        class="rounded-xl border border-slate-200/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="cancelEdit"
      >
        إلغاء التعديل
      </button>
      <button
        type="button"
        class="rounded-xl border border-slate-200/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="emit('close')"
      >
        إغلاق
      </button>
      <button
        type="button"
        class="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        :disabled="isSaving"
        @click="onSubmit"
      >
        {{ isSaving ? 'جاري الحفظ...' : editingId ? 'تحديث القسم' : 'إضافة قسم' }}
      </button>
    </template>
  </AppModal>
</template>
