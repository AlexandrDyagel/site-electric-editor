<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Clock,
  Info,
  Lightbulb,
  ListTree,
} from 'lucide-vue-next'
import ArticleCard from '@/components/articles/ArticleCard.vue'
import { ARTICLES, ARTICLE_BY_SLUG } from '@/data/articles'
import { formatDate } from '@/utils/format'
import { usePageMeta } from '@/composables/usePageMeta'

const route = useRoute()
const progress = ref(0)

const article = computed(() => ARTICLE_BY_SLUG.get(String(route.params.slug)))

const toc = computed(() => {
  if (!article.value) return []
  return article.value.blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === 'heading')
    .map(({ block, index }) => ({
      id: `section-${index}`,
      text: block.type === 'heading' ? block.text : '',
      level: block.type === 'heading' ? block.level ?? 2 : 2,
    }))
})

const related = computed(() => {
  if (!article.value) return []
  const others = ARTICLES.filter((item) => item.slug !== article.value?.slug)
  const sameCategory = others.filter((item) => item.category === article.value?.category)
  const rest = others.filter((item) => item.category !== article.value?.category)
  return [...sameCategory, ...rest].slice(0, 3)
})

usePageMeta(() => ({
  title: article.value ? `${article.value.title} — ВОЛЬТ.ЛАБ` : 'Статья не найдена — ВОЛЬТ.ЛАБ',
  description: article.value?.excerpt,
}))

function updateProgress(): void {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  progress.value = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0
}

onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateProgress)
})

const calloutClass = {
  info: 'border-sky-500/25 bg-sky-500/[.07] text-sky-900 dark:text-sky-100',
  warning: 'border-amber-500/25 bg-amber-500/[.08] text-amber-950 dark:text-amber-100',
  tip: 'border-volt-500/25 bg-volt-400/[.08] text-ink-900 dark:text-volt-100',
}
</script>

<template>
  <div>
    <div class="fixed left-0 top-[var(--header-height)] z-40 h-0.5 bg-volt-500 transition-[width] duration-150" :style="{ width: `${progress}%` }"></div>

    <div v-if="article">
      <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-br" :class="article.accent"></div>
        <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:40px_40px] opacity-25 dark:bg-grid-dark dark:opacity-35"></div>
        <div class="container-page relative py-12 lg:py-16">
          <div class="max-w-3xl">
          <RouterLink to="/articles" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-500 transition hover:text-ink-900 dark:text-cloud-400 dark:hover:text-white">
            <ArrowLeft :size="13" />
            Все материалы
          </RouterLink>
          <div class="mt-6 flex flex-wrap items-center gap-2">
            <span class="chip chip-volt">{{ article.category }}</span>
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500 dark:text-cloud-400">
              <Clock :size="11" /> {{ article.readMinutes }} минут
            </span>
            <span class="text-[10px] text-ink-400 dark:text-cloud-400/50">·</span>
            <span class="text-[10px] font-medium text-ink-500 dark:text-cloud-400">{{ formatDate(article.date) }}</span>
          </div>
          <h1 class="mt-5 text-3xl font-extrabold leading-[1.08] tracking-[-0.05em] text-ink-950 sm:text-4xl lg:text-[54px] dark:text-white">
            {{ article.title }}
          </h1>
          <p class="mt-5 max-w-2xl text-[15px] leading-7 text-ink-600 dark:text-cloud-300">
            {{ article.excerpt }}
          </p>
          <div class="mt-7 flex items-center gap-3 border-t border-ink-950/10 pt-5 dark:border-white/10">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 font-mono text-[10px] font-bold text-volt-300 dark:bg-white/10">
              VL
            </span>
            <div>
              <p class="text-[11px] font-bold text-ink-800 dark:text-cloud-200">{{ article.author }}</p>
              <p class="text-[10px] text-ink-500 dark:text-cloud-400/60">Редакция ВОЛЬТ.ЛАБ</p>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section class="container-page py-12 lg:py-16">
        <div class="grid gap-10 lg:grid-cols-[minmax(0,760px)_1fr] lg:gap-16">
          <article class="min-w-0">
            <div class="space-y-6">
              <template v-for="(block, index) in article.blocks" :key="index">
                <p v-if="block.type === 'paragraph'" class="text-[15px] leading-8 text-ink-700 dark:text-cloud-300">
                  {{ block.text }}
                </p>

                <component
                  :is="block.level === 3 ? 'h3' : 'h2'"
                  v-else-if="block.type === 'heading'"
                  :id="`section-${index}`"
                  class="scroll-mt-28 text-2xl font-extrabold tracking-[-0.035em] text-ink-950 dark:text-white"
                  :class="block.level === 3 ? '!text-xl' : 'pt-4'"
                >
                  {{ block.text }}
                </component>

                <ul v-else-if="block.type === 'list' && !block.ordered" class="space-y-2.5 pl-0">
                  <li
                    v-for="item in block.items"
                    :key="item"
                    class="relative pl-6 text-[14px] leading-7 text-ink-600 before:absolute before:left-0 before:top-[11px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-volt-500 dark:text-cloud-300"
                  >
                    {{ item }}
                  </li>
                </ul>

                <ol v-else-if="block.type === 'list' && block.ordered" class="space-y-2.5">
                  <li
                    v-for="(item, itemIndex) in block.items"
                    :key="item"
                    class="flex gap-3 text-[14px] leading-7 text-ink-600 dark:text-cloud-300"
                  >
                    <span class="mt-1 font-mono text-[11px] font-bold text-volt-700 dark:text-volt-300">{{ String(itemIndex + 1).padStart(2, '0') }}</span>
                    {{ item }}
                  </li>
                </ol>

                <div
                  v-else-if="block.type === 'formula'"
                  class="overflow-hidden rounded-2xl border border-cloud-200 bg-ink-950 px-5 py-5 text-white shadow-lg dark:border-white/10"
                >
                  <div class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-volt-300">
                    <span class="h-1.5 w-1.5 rounded-full bg-volt-400"></span>
                    формула
                  </div>
                  <p class="mt-3 overflow-x-auto whitespace-nowrap font-mono text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {{ block.expression }}
                  </p>
                  <p v-if="block.caption" class="mt-2 text-[10px] leading-5 text-white/35">
                    {{ block.caption }}
                  </p>
                </div>

                <div
                  v-else-if="block.type === 'callout'"
                  class="flex gap-3 rounded-2xl border p-5"
                  :class="calloutClass[block.tone]"
                >
                  <span class="mt-0.5 shrink-0">
                    <AlertTriangle v-if="block.tone === 'warning'" :size="18" />
                    <Lightbulb v-else-if="block.tone === 'tip'" :size="18" />
                    <Info v-else :size="18" />
                  </span>
                  <div>
                    <p class="text-[12px] font-extrabold">{{ block.title }}</p>
                    <p class="mt-1.5 text-[12px] leading-6 opacity-80">{{ block.text }}</p>
                  </div>
                </div>

                <div v-else-if="block.type === 'table'" class="overflow-hidden rounded-2xl border border-cloud-200 dark:border-white/10">
                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[560px] border-collapse text-left text-[12px]">
                      <thead class="bg-cloud-100 dark:bg-white/[.05]">
                        <tr>
                          <th
                            v-for="header in block.headers"
                            :key="header"
                            class="border-b border-cloud-200 px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink-500 dark:border-white/10 dark:text-cloud-400"
                          >
                            {{ header }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex" class="border-b border-cloud-200/70 last:border-0 dark:border-white/[.06]">
                          <td
                            v-for="(cell, cellIndex) in row"
                            :key="cellIndex"
                            class="px-4 py-3 text-ink-600 dark:text-cloud-300"
                            :class="cellIndex === 0 ? 'font-semibold text-ink-800 dark:text-white' : ''"
                          >
                            {{ cell }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-if="block.caption" class="border-t border-cloud-200 bg-cloud-50 px-4 py-2 text-[10px] text-ink-400 dark:border-white/[.06] dark:bg-white/[.02] dark:text-cloud-400/60">
                    {{ block.caption }}
                  </p>
                </div>

                <div v-else-if="block.type === 'steps'" class="space-y-3">
                  <div v-for="(step, stepIndex) in block.items" :key="step.title" class="flex gap-4 rounded-2xl border border-cloud-200 bg-white/60 p-4 dark:border-white/[.07] dark:bg-white/[.025]">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-volt-400/15 font-mono text-[10px] font-bold text-volt-700 dark:text-volt-300">
                      {{ String(stepIndex + 1).padStart(2, '0') }}
                    </span>
                    <div>
                      <p class="text-[12px] font-extrabold text-ink-900 dark:text-white">{{ step.title }}</p>
                      <p class="mt-1 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">{{ step.text }}</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <div class="mt-12 rounded-2xl border border-cloud-200 bg-white/60 p-5 dark:border-white/[.07] dark:bg-white/[.025]">
              <p class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400 dark:text-cloud-400/50">Проверить на схеме</p>
              <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm font-semibold text-ink-800 dark:text-cloud-200">
                  Соберите линию в редакторе и сравните с расчётом.
                </p>
                <RouterLink to="/editor" class="btn-primary btn-sm shrink-0">
                  Открыть редактор <ArrowUpRight :size="13" />
                </RouterLink>
              </div>
            </div>
          </article>

          <aside class="hidden lg:block">
            <div class="sticky top-28 space-y-5">
              <div class="surface p-5">
                <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400 dark:text-cloud-400/60">
                  <ListTree :size="13" /> Содержание
                </div>
                <nav class="mt-4 space-y-0.5">
                  <a
                    v-for="item in toc"
                    :key="item.id"
                    :href="`#${item.id}`"
                    class="block rounded-lg py-1.5 text-[11px] leading-5 text-ink-500 transition hover:bg-cloud-100 hover:text-ink-900 dark:text-cloud-400 dark:hover:bg-white/[.05] dark:hover:text-white"
                    :class="item.level === 3 ? 'pl-6 pr-2' : 'px-2 font-semibold'"
                  >
                    {{ item.text }}
                  </a>
                </nav>
              </div>

              <div class="relative overflow-hidden rounded-2xl border border-volt-500/20 bg-ink-900 p-5 text-white">
                <div class="absolute inset-0 bg-grid-dark bg-[size:22px_22px] opacity-40"></div>
                <div class="relative">
                  <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-volt-400/15 text-volt-300">
                    <BookOpen :size="16" />
                  </span>
                  <p class="mt-4 text-sm font-extrabold">Нужен расчёт под свой щит?</p>
                  <p class="mt-1.5 text-[11px] leading-5 text-cloud-400">
                    Откройте демо-проект и замените нагрузки на свои.
                  </p>
                  <RouterLink to="/editor" class="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-volt-300">
                    Перейти в редактор <ArrowUpRight :size="12" />
                  </RouterLink>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section v-if="related.length" class="border-t border-cloud-200/70 py-14 dark:border-white/[.06]">
        <div class="container-page">
          <div class="flex items-end justify-between">
            <h2 class="text-2xl font-extrabold text-ink-900 dark:text-white">Читать дальше</h2>
            <RouterLink to="/articles" class="link-arrow">
              Все статьи <ArrowUpRight :size="14" />
            </RouterLink>
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            <ArticleCard v-for="item in related" :key="item.slug" :article="item" />
          </div>
        </div>
      </section>
    </div>

    <section v-else class="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span class="font-mono text-6xl font-bold text-cloud-300 dark:text-white/10">404</span>
      <h1 class="mt-4 text-3xl font-extrabold text-ink-900 dark:text-white">Статья не найдена</h1>
      <p class="mt-3 text-sm text-ink-500 dark:text-cloud-400">Возможно, ссылка устарела или в адресе опечатка.</p>
      <RouterLink to="/articles" class="btn-primary mt-6">Вернуться в справочник</RouterLink>
    </section>
  </div>
</template>
