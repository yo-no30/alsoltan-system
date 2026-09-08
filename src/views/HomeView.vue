<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_NAV_ITEMS, filterNavItems } from '@/navigation/appNav'

const auth = useAuthStore()

const cards = computed(() =>
  filterNavItems(
    APP_NAV_ITEMS.filter((item) => item.to !== '/home'),
    auth.isAdmin,
  ),
)

/** Distinct, polished gradients — clear color identity without neon/noise. */
const cardThemes = [
  {
    card: 'border-brand-200/70 from-brand-100 via-brand-50 to-white',
    icon: 'bg-brand-500 text-white shadow-brand-500/25',
    title: 'text-brand-900',
    desc: 'text-brand-700/80',
  },
  {
    card: 'border-sky-200/80 from-sky-100 via-sky-50 to-white',
    icon: 'bg-sky-600 text-white shadow-sky-600/25',
    title: 'text-sky-950',
    desc: 'text-sky-800/70',
  },
  {
    card: 'border-emerald-200/80 from-emerald-100 via-emerald-50 to-white',
    icon: 'bg-emerald-600 text-white shadow-emerald-600/25',
    title: 'text-emerald-950',
    desc: 'text-emerald-800/70',
  },
  {
    card: 'border-amber-200/80 from-amber-100 via-amber-50 to-white',
    icon: 'bg-amber-500 text-white shadow-amber-500/25',
    title: 'text-amber-950',
    desc: 'text-amber-900/70',
  },
  {
    card: 'border-violet-200/80 from-violet-100 via-violet-50 to-white',
    icon: 'bg-violet-600 text-white shadow-violet-600/25',
    title: 'text-violet-950',
    desc: 'text-violet-800/70',
  },
  {
    card: 'border-teal-200/80 from-teal-100 via-teal-50 to-white',
    icon: 'bg-teal-600 text-white shadow-teal-600/25',
    title: 'text-teal-950',
    desc: 'text-teal-800/70',
  },
  {
    card: 'border-orange-200/80 from-orange-100 via-orange-50 to-white',
    icon: 'bg-orange-500 text-white shadow-orange-500/25',
    title: 'text-orange-950',
    desc: 'text-orange-900/70',
  },
] as const

function themeFor(index: number): (typeof cardThemes)[number] {
  return cardThemes[index % cardThemes.length]!
}
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-6"
  >
    <div class="flex min-h-full w-full shrink-0 flex-col">
      <div class="min-h-0 flex-1" />
      <div
        class="mx-auto grid w-full max-w-[80rem] shrink-0 grid-cols-2 gap-6 md:grid-cols-5 md:gap-8"
      >
        <RouterLink
          v-for="(card, index) in cards"
          :key="card.to"
          :to="card.to"
          class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border bg-gradient-to-br p-5 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          :class="themeFor(index).card"
        >
          <div
            class="flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition duration-200 group-hover:scale-[1.04]"
            :class="themeFor(index).icon"
          >
            <component :is="card.icon" class="h-8 w-8" :stroke-width="1.75" />
          </div>
          <div class="min-w-0 px-1">
            <p
              class="text-lg font-semibold leading-snug"
              :class="themeFor(index).title"
            >
              {{ card.label }}
            </p>
            <p
              class="mt-2 line-clamp-2 text-sm leading-relaxed"
              :class="themeFor(index).desc"
            >
              {{ card.description }}
            </p>
          </div>
        </RouterLink>
      </div>
      <div class="min-h-0 flex-1" />
    </div>
  </section>
</template>
