import { afterEach, describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { archiveItems, findArchiveItem } from '../data/archive'
import { createAppRouter } from '../router'

const original = structuredClone(JSON.parse(JSON.stringify(archiveItems)))
afterEach(() => {
  archiveItems.splice(0, archiveItems.length, ...structuredClone(original))
})

async function open() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/inbox')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('illustrative inbox', () => {
  it('defaults to labeled needs-review examples with real fixture links and explicit boundaries', async () => {
    const { wrapper, router } = await open()
    expect(wrapper.get('label[for="inbox-list"]').text()).toBe('Show examples')
    expect((wrapper.get('#inbox-list').element as HTMLSelectElement).value).toBe('Needs review')
    expect(wrapper.get('main').text()).toContain('review statuses are synthetic examples')
    expect(wrapper.get('main').text()).toContain('Review is not connected')
    expect(wrapper.get('main').text()).toContain('saving review history are not available')
    expect(wrapper.findAll('main button')).toHaveLength(0)
    expect(wrapper.findAll('main li')).toHaveLength(2)
    expect(wrapper.get('a[href="/archive/summer-letter"]').text()).toBe('A letter from summer camp')
    expect(wrapper.get('a[href="/archive/long-filename"]').text()).toContain('a-very-long-filename')
    expect(wrapper.get('main').text()).toContain('Possibly late 1960s')
    expect(wrapper.findAll('main li').every((li) => li.text().includes('Needs review'))).toBe(true)
    await router.push('/archive/summer-letter')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('A letter from summer camp')
    wrapper.unmount()
  })

  it('selects reviewed examples and keeps membership independent of metadata and AI', async () => {
    const letter = findArchiveItem('summer-letter')!
    letter.title = 'Edited demo title'
    letter.aiSuggestion = undefined
    const { wrapper } = await open()
    expect(wrapper.get('a[href="/archive/summer-letter"]').text()).toBe('Edited demo title')
    await wrapper.get('#inbox-list').setValue('Reviewed')
    expect(wrapper.get('#inbox-list-heading').text()).toBe('Reviewed')
    expect(wrapper.findAll('main li')).toHaveLength(1)
    expect(wrapper.get('main li').text()).toContain('Reviewed')
    expect(wrapper.get('a[href="/archive/garden-afternoon"]').text()).toBe(
      'An afternoon in the garden',
    )
    expect(wrapper.find('a[href="/archive/summer-letter"]').exists()).toBe(false)
    await wrapper.get('#inbox-list').setValue('Needs review')
    expect(wrapper.get('a[href="/archive/summer-letter"]').text()).toBe('Edited demo title')
    wrapper.unmount()
  })
})
