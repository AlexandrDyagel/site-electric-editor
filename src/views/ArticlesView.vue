<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUpRight, BookOpen, Search, Sparkles } from 'lucide-vue-next'
import ArticleCard from '@/components/articles/ArticleCard.vue'
import { ARTICLES, ARTICLE_CATEGORIES } from '@/data/articles'
import { usePageMeta } from '@/composables/usePageMeta'

const category = ref('Все')
const search = ref('')

usePageMeta({
  title: 'Статьи и справочники по электрике — ВОЛЬТ.ЛАБ',
  description:
    'Практические статьи об автоматических выключателях, УЗО, сечении кабеля, перекосе фаз, селективности и сборке электрических щитов.',
})

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return ARTICLES.filter((article) => {
    const categoryMatch = category.value === 'Все' || article.category === category.value
    const searchMatch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    return categoryMatch && searchMatch
  })
})

const featured = computed(() => ARTICLES.find((article) => article.featured) ?? ARTICLES[0])
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-volt-300/20 blur-[100px] dark:bg-volt-400/[.06]"></div>
      <div class="container-page relative py-14 lg:py-20">
        <div class="max-w-3xl">
          <p class="eyebrow">Справочник электрика</p>
          <h1 class="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-0.05em] text-ink-950 sm:text-5xl lg:text-6xl dark:text-white">
            Разобраться,<br class="sm:hidden" /> а не угадать.
          </h1>
          <p class="mt-5 max-w-2xl text-[15px] leading-7 text-ink-600 sm:text-base dark:text-cloud-400">
            Короткие инженерные материалы: как выбрать защиту, проверить кабель и собрать щит,
            который не придётся переделывать.
          </p>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative w-full sm:max-w-xs">
            <Search :size="15" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-cloud-400" />
            <input
              v-model="search"
              type="search"
              class="input !pl-10"
              placeholder="Поиск по статьям"
              aria-label="Поиск по статьям"
            />
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="item in ARTICLE_CATEGORIES"
              :key="item"
              type="button"
              class="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
              :class="
                category === item
                  ? 'bg-ink-900 text-white dark:bg-volt-400 dark:text-ink-950'
                  : 'border border-cloud-200 bg-white/60 text-ink-500 hover:border-cloud-300 dark:border-white/10 dark:bg-white/[.03] dark:text-cloud-400'
              "
              @click="category = item"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-12 lg:py-16">
      <div v-if="featured && category === 'Все' && !search" class="mb-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <ArticleCard :article="featured" feature />
        <div class="surface relative overflow-hidden p-6">
          <div class="absolute inset-0 bg-grid-light bg-[size:26px_26px] opacity-30 dark:bg-grid-dark dark:opacity-40"></div>
          <div class="relative flex h-full flex-col justify-between">
            <div>
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/15 text-volt-700 dark:text-volt-300">
                <BookOpen :size="18" />
              </span>
              <p class="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-volt-700 dark:text-volt-300">
                Инженерный подход
              </p>
              <h2 class="mt-2 text-2xl font-extrabold leading-tight text-ink-900 dark:text-white">
                Каждый расчёт можно проверить в редакторе
              </h2>
              <p class="mt-3 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">
                Соберите линию, задайте нагрузку и посмотрите, как система проверяет номинал,
                сечение, падение напряжения и селективность.
              </p>
            </div>
            <RouterLink to="/editor" class="btn-secondary mt-6 self-start">
              Попробовать
              <ArrowUpRight :size="14" />
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="mb-5 flex items-end justify-between gap-4">
        <div>
          <p class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400 dark:text-cloud-400/60">
            Материалы
          </p>
          <h2 class="mt-1 text-2xl font-extrabold text-ink-900 dark:text-white">
            {{ category === 'Все' ? 'Все статьи' : category }}
          </h2>
        </div>
        <span class="font-mono text-[11px] text-ink-400 dark:text-cloud-400/60">
          {{ String(filtered.length).padStart(2, '0') }} / {{ ARTICLES.length }}
        </span>
      </div>

      <div v-if="filtered.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ArticleCard v-for="article in filtered" :key="article.slug" :article="article" />
      </div>
      <div v-else class="surface flex flex-col items-center px-6 py-16 text-center">
        <Sparkles :size="30" class="text-volt-500" />
        <h3 class="mt-4 text-lg font-extrabold text-ink-900 dark:text-white">Ничего не нашлось</h3>
        <p class="mt-2 max-w-sm text-sm text-ink-500 dark:text-cloud-400">
          Попробуйте другой запрос или сбросьте фильтр категории.
        </p>
        <button type="button" class="btn-secondary mt-5" @click="search = ''; category = 'Все'">
          Сбросить фильтры
        </button>
      </div>
    </section>
  </div>
</template>
