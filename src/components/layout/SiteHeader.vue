<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowUpRight, Menu, X } from 'lucide-vue-next'
import BrandMark from '@/components/common/BrandMark.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const route = useRoute()
const open = ref(false)

const navigation = [
  { label: 'Услуги', to: '/services' },
  { label: 'Статьи', to: '/articles' },
  { label: 'Калькуляторы', to: '/calculators' },
  { label: 'Проекты', to: '/projects' },
]

watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-cloud-200/80 bg-cloud-50/85 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink-950/80"
  >
    <div class="container-page flex h-[var(--header-height)] items-center justify-between gap-6">
      <BrandMark />

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="relative rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-600 transition hover:text-ink-950 dark:text-cloud-400 dark:hover:text-white"
          active-class="!text-ink-950 dark:!text-white"
        >
          {{ item.label }}
          <span
            class="absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-volt-500 transition-transform duration-200"
            :class="route.path.startsWith(item.to) ? 'scale-x-100' : ''"
          ></span>
        </RouterLink>
      </nav>

      <div class="flex items-center gap-2">
        <ThemeToggle class="hidden sm:inline-flex" />
        <RouterLink to="/editor" class="btn-primary btn-sm hidden sm:inline-flex">
          Редактор щита
          <ArrowUpRight :size="14" />
        </RouterLink>
        <button
          type="button"
          class="icon-btn lg:hidden"
          :aria-expanded="open"
          aria-controls="mobile-nav"
          :aria-label="open ? 'Закрыть меню' : 'Открыть меню'"
          @click="open = !open"
        >
          <X v-if="open" :size="18" />
          <Menu v-else :size="18" />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div
        v-if="open"
        id="mobile-nav"
        class="border-t border-cloud-200 bg-cloud-50 px-5 pb-5 pt-3 dark:border-white/[.06] dark:bg-ink-950 lg:hidden"
      >
        <nav class="flex flex-col" aria-label="Мобильная навигация">
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between border-b border-cloud-200/60 py-3 text-sm font-semibold text-ink-700 dark:border-white/[.05] dark:text-cloud-300"
            @click="open = false"
          >
            {{ item.label }}
            <ArrowUpRight :size="15" class="opacity-40" />
          </RouterLink>
        </nav>
        <div class="mt-4 flex items-center gap-2">
          <RouterLink to="/editor" class="btn-primary flex-1" @click="open = false">
            Открыть редактор
            <ArrowUpRight :size="15" />
          </RouterLink>
          <ThemeToggle />
        </div>
      </div>
    </Transition>
  </header>
</template>
