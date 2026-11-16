import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import ArchiveView from '../views/ArchiveView.vue'
import ItemView from '../views/ItemView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InboxView from '../views/InboxView.vue'
import FamilyView from '../views/FamilyView.vue'
import UploadView from '../views/UploadView.vue'
import { nextTick } from 'vue'
import { appPinia, useCollectionContext } from '../stores/collection-context'

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const context = useCollectionContext(appPinia)
  let currentPosition = window.history.state?.position
  const router = createRouter({
    history,
    async scrollBehavior(to, from, savedPosition) {
      const returning = context.returning
      if (returning && to.fullPath === returning.url) {
        await nextTick()
        // Cards reserve preview dimensions; two frames allow the result grid to lay out.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
        if (router.currentRoute.value.fullPath !== to.fullPath || context.returning !== returning)
          return false
        const target =
          document.querySelector<HTMLElement>(
            `[data-archive-card="${CSS.escape(returning.itemId)}"]`,
          ) ?? document.querySelector<HTMLElement>('main h1')
        target?.focus({ preventScroll: true })
        context.returning = null
        return { left: returning.x, top: returning.y, behavior: 'instant' }
      }
      if (to.path === from.path && !savedPosition) return false
      return savedPosition || { left: 0, top: 0 }
    },
    routes: [
      { path: '/', component: ArchiveView, meta: { title: 'Archive', destination: 'archive' } },
      {
        path: '/inbox',
        component: InboxView,
        meta: { title: 'Inbox', destination: 'inbox' },
      },
      {
        path: '/family',
        component: FamilyView,
        meta: { title: 'Family', destination: 'family' },
      },
      {
        path: '/upload',
        component: UploadView,
        meta: { title: 'Upload files', destination: 'upload' },
      },
      { path: '/archive/:id', name: 'item', component: ItemView, meta: { destination: 'archive' } },
      { path: '/:pathMatch(.*)*', component: NotFoundView },
    ],
  })
  router.beforeEach((to, from) => {
    context.returning =
      from.name === 'item' && to.path === '/'
        ? context.resolveReturn(
            currentPosition,
            String(from.params.id),
            to.fullPath,
            window.history.state?.position,
          )
        : null
    context.breadcrumb = false
  })
  router.afterEach((to, from, failure) => {
    if (failure) return
    const position = window.history.state?.position
    if (to.name === 'item') {
      const itemId = String(to.params.id)
      let token = window.history.state?.collectionContext as string | undefined
      if (context.captured?.url === from.fullPath && context.captured.itemId === itemId) {
        token = crypto.randomUUID()
        window.history.replaceState({ ...window.history.state, collectionContext: token }, '')
      }
      context.enterItem(position, from.fullPath, itemId, token)
    }
    currentPosition = position
  })
  return router
}

export default createAppRouter()
