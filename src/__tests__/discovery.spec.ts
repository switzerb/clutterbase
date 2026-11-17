import { describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'

async function open(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('mock archive discovery', () => {
  it('combines direct URL criteria, count, and timestamp order', async () => {
    const { wrapper } = await open('/?q=pdf&type=pdf&sort=oldest')
    expect(wrapper.get<HTMLInputElement>('#archive-search').element.value).toBe('pdf')
    expect(wrapper.get<HTMLSelectElement>('#archive-type').element.value).toBe('pdf')
    expect(wrapper.get<HTMLSelectElement>('#archive-sort').element.value).toBe('oldest')
    expect(wrapper.get('[role=status]').text()).toBe('2 results')
    expect(wrapper.findAll('main li h2').map((item) => item.text())).toEqual([
      'A note in progress',
      'A letter from summer camp',
    ])
    wrapper.unmount()
  })

  it.each([
    ['Mara', 2],
    ['1975', 1],
    ['sunny afternoon', 1],
    ['unidentified-summer', 1],
    ['3 pages', 1],
    ['porch-photo.jpg', 0],
  ])('matches displayed text for %s', async (query, count) => {
    const { wrapper } = await open(`/?q=${encodeURIComponent(query)}`)
    expect(wrapper.get('[role=status]').text()).toContain(`${count} result`)
    wrapper.unmount()
  })

  it('clears no results while preserving unrelated URL state', async () => {
    const { wrapper, router } = await open('/?q=nonexistent&type=photo&sort=oldest&other=kept')
    expect(wrapper.text()).toContain('No results')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear criteria')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/?other=kept')
    expect(wrapper.get('[role=status]').text()).toBe('5 results')
    wrapper.unmount()
  })

  it('updates the URL from controls and clears all criteria', async () => {
    const { wrapper, router } = await open('/?other=kept')
    await wrapper.get('#archive-search').setValue('Mara')
    await flushPromises()
    await wrapper.get('#archive-type').setValue('photo')
    await flushPromises()
    await wrapper.get('#archive-sort').setValue('oldest')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({
      other: 'kept',
      q: 'Mara',
      type: 'photo',
      sort: 'oldest',
    })
    expect(wrapper.get('[role=status]').text()).toBe('1 result')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear all')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/?other=kept')
    expect(wrapper.get('[role=status]').text()).toBe('5 results')
    wrapper.unmount()
  })

  it('restores changes from navigation and retains demo states', async () => {
    const { wrapper, router } = await open('/?q=Mara')
    await router.push('/?type=pdf&sort=oldest')
    expect(wrapper.get<HTMLInputElement>('#archive-search').element.value).toBe('')
    expect(wrapper.get<HTMLSelectElement>('#archive-type').element.value).toBe('pdf')
    router.back()
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#archive-search').element.value).toBe('Mara')
    await router.push('/?demo=empty&q=Mara')
    expect(wrapper.text()).toContain('The archive is empty')
    await router.push('/?q=Mara')
    expect(wrapper.get('[role=status]').text()).toBe('2 results')
    wrapper.unmount()
  })

  it('uses safe defaults for malformed and repeated criteria', async () => {
    const { wrapper } = await open('/?q=x&q=y&type=photo&type=pdf&sort=bad')
    expect(wrapper.get<HTMLInputElement>('#archive-search').element.value).toBe('')
    expect(wrapper.get<HTMLSelectElement>('#archive-type').element.value).toBe('all')
    expect(wrapper.get<HTMLSelectElement>('#archive-sort').element.value).toBe('newest')
    expect(wrapper.get('[role=status]').text()).toBe('5 results')
    wrapper.unmount()
  })
})
