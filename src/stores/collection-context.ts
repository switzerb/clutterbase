import { createPinia, defineStore } from 'pinia'

export const appPinia = createPinia()

export interface CollectionContext {
  url: string
  itemId: string
  originPosition: number
  x: number
  y: number
}

// Memory only: entries belong to this document's history, never to a later reload.
export const useCollectionContext = defineStore('collection-context', {
  state: () => ({
    captured: null as CollectionContext | null,
    entries: {} as Record<number, CollectionContext>,
    tokens: {} as Record<number, string>,
    returning: null as CollectionContext | null,
    breadcrumb: false,
  }),
  actions: {
    capture(context: CollectionContext) {
      this.captured = context
    },
    enterItem(position: number, from: string, itemId: string, token: string | undefined) {
      const context = this.captured
      if (context && context.url === from && context.itemId === itemId && token) {
        this.entries[position] = context
        this.tokens[position] = token
      } else if (
        !token ||
        this.tokens[position] !== token ||
        this.entries[position]?.itemId !== itemId
      ) {
        delete this.entries[position]
        delete this.tokens[position]
      }
      this.captured = null
    },
    destination(position: number, itemId: string) {
      const context = this.entries[position]
      return context?.itemId === itemId ? context.url : '/'
    },
    resolveReturn(position: number, itemId: string, url: string, targetPosition: number) {
      const context = this.entries[position]
      return context &&
        context.itemId === itemId &&
        context.url === url &&
        (this.breadcrumb || context.originPosition === targetPosition)
        ? context
        : null
    },
  },
})
