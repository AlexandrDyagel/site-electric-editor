import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/components/layout/PublicLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 90 }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { title: 'ВОЛЬТ.ЛАБ — электрика, расчёты и редактор щитов' },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/ServicesView.vue'),
          meta: { title: 'Услуги — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/ArticlesView.vue'),
          meta: { title: 'Статьи и справочники — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'articles/:slug',
          name: 'article',
          component: () => import('@/views/ArticleView.vue'),
          meta: { title: 'Статья — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'calculators',
          name: 'calculators',
          component: () => import('@/views/CalculatorsView.vue'),
          meta: { title: 'Калькуляторы электрика — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'calculators/current',
          name: 'calculator-current',
          component: () => import('@/views/calculators/CurrentCalculatorView.vue'),
          meta: { title: 'Расчёт тока по мощности — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'calculators/cable',
          name: 'calculator-cable',
          component: () => import('@/views/calculators/CableCalculatorView.vue'),
          meta: { title: 'Сечение кабеля по ПУЭ — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'calculators/breaker',
          name: 'calculator-breaker',
          component: () => import('@/views/calculators/BreakerCalculatorView.vue'),
          meta: { title: 'Подбор автоматического выключателя — ВОЛЬТ.ЛАБ' },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { title: 'Мои проекты щитов — ВОЛЬТ.ЛАБ' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'Страница не найдена — ВОЛЬТ.ЛАБ' },
        },
      ],
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
      meta: { title: 'Редактор щита — ВОЛЬТ.ЛАБ', fullscreen: true },
    },
  ],
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'ВОЛЬТ.ЛАБ'
  document.title = title
})

export default router
