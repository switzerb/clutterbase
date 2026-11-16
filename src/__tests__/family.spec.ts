import { afterEach, describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { findArchiveItem } from '../data/archive'
import { createAppRouter } from '../router'

afterEach(() => {
  findArchiveItem('summer-letter')!.title = 'A letter from summer camp'
})

describe('illustrative family', () => {
  it('selects synthetic people and links their associated material with live titles', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/family')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    const buttons = wrapper.findAll('main button')
    expect(buttons.map((button) => button.text())).toEqual(['Mara', 'Alex'])
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'false'])
    expect(wrapper.get('main').text()).toContain('not connected person records')
    expect(wrapper.get('main').text()).toContain('Profile editing and saving are not available')
    expect(wrapper.get('#person-heading').text()).toBe('Mara')
    expect(wrapper.get('main').text()).toContain('summer adventures')
    expect(wrapper.get('a[href="/archive/summer-letter"]').text()).toBe('A letter from summer camp')
    findArchiveItem('summer-letter')!.title = 'Edited demo title'
    await flushPromises()
    expect(wrapper.get('a[href="/archive/summer-letter"]').text()).toBe('Edited demo title')
    await buttons[1]!.trigger('click')
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['false', 'true'])
    expect(wrapper.get('#person-heading').text()).toBe('Alex')
    expect(wrapper.get('main').text()).toContain('tending garden paths')
    expect(wrapper.find('a[href="/archive/summer-letter"]').exists()).toBe(false)
    expect(wrapper.get('a[href="/archive/garden-afternoon"]').text()).toBe(
      'An afternoon in the garden',
    )
    await wrapper.get('a[href="/archive/garden-afternoon"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/archive/garden-afternoon')
    wrapper.unmount()
  })
})
