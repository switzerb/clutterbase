import { createPinia } from 'pinia'
import { describe, expect, it } from 'vite-plus/test'
import { useCollectionContext } from '../stores/collection-context'

describe('session collection context', () => {
  it('matches the item, exact URL and originating history entry', () => {
    const store = useCollectionContext(createPinia())
    const context = {
      url: '/?q=pdf&type=pdf&sort=oldest',
      itemId: 'letter',
      originPosition: 3,
      x: 0,
      y: 500,
    }
    store.capture(context)
    store.enterItem(4, context.url, 'letter', 'entry-a')
    expect(store.destination(4, 'letter')).toBe(context.url)
    expect(store.destination(4, 'other')).toBe('/')
    expect(store.resolveReturn(4, 'letter', context.url, 3)).toEqual(context)
    expect(store.resolveReturn(4, 'letter', '/', 3)).toBeNull()
    expect(store.resolveReturn(4, 'letter', context.url, 2)).toBeNull()
    store.breadcrumb = true
    expect(store.resolveReturn(4, 'letter', context.url, 5)).toEqual(context)
    expect(store.resolveReturn(4, 'other', context.url, 5)).toBeNull()
    store.enterItem(4, '/family', 'letter', undefined)
    expect(store.destination(4, 'letter')).toBe('/')
  })

  it('retains a matching forward visit and replaces context on a new visit', () => {
    const store = useCollectionContext(createPinia())
    const context = { url: '/?sort=oldest', itemId: 'one', originPosition: 1, x: 0, y: 200 }
    store.capture(context)
    store.enterItem(2, context.url, 'one', 'entry-a')
    store.enterItem(2, '/', 'one', 'entry-a')
    expect(store.destination(2, 'one')).toBe(context.url)
    store.capture({ ...context, itemId: 'two', y: 300 })
    store.enterItem(2, context.url, 'two', 'entry-b')
    expect(store.destination(2, 'one')).toBe('/')
    expect(store.resolveReturn(2, 'two', context.url, 1)?.y).toBe(300)
  })

  it('clears a reused history position when its token belongs to an unrelated entry', () => {
    const store = useCollectionContext(createPinia())
    const context = { url: '/?sort=oldest', itemId: 'one', originPosition: 1, x: 0, y: 200 }
    store.capture(context)
    store.enterItem(2, context.url, 'one', 'entry-a')
    store.enterItem(2, '/family', 'one', 'entry-b')
    expect(store.destination(2, 'one')).toBe('/')
    expect(store.resolveReturn(2, 'one', context.url, 1)).toBeNull()
    expect(store.entries[2]).toBeUndefined()
    expect(store.tokens[2]).toBeUndefined()
  })

  it('starts a fresh session without context from another store', () => {
    const previous = useCollectionContext(createPinia())
    previous.capture({ url: '/?q=photo', itemId: 'one', originPosition: 1, x: 0, y: 200 })
    previous.enterItem(2, '/?q=photo', 'one', 'entry-a')
    const fresh = useCollectionContext(createPinia())
    expect(fresh.destination(2, 'one')).toBe('/')
    expect(fresh.resolveReturn(2, 'one', '/?q=photo', 1)).toBeNull()
  })
})
