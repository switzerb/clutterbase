import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import ArchiveView from '../views/ArchiveView.vue'
import ItemView from '../views/ItemView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InboxView from '../views/InboxView.vue'
import FamilyView from '../views/FamilyView.vue'
import UploadView from '../views/UploadView.vue'

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  return createRouter({
    history,
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
}

export default createAppRouter()
