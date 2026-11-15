import { afterEach, describe, it, expect } from 'vite-plus/test'

import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('renders the branded foundation preview without a manual theme control', () => {
    wrapper = mount(App)
    expect(wrapper.get('h1').text()).toBe('Family material, thoughtfully kept.')
    expect(wrapper.get('p').text()).toBe('Clutterbase.')
    expect(wrapper.get('p span').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toContain('Archive browsing is coming next.')
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.find('input, select, [role="switch"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toBe('Open dialog')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('uses semantic colors and leaves the synthetic artwork unfiltered', () => {
    wrapper = mount(App)
    expect(wrapper.get('main').classes()).toContain('bg-canvas')
    expect(wrapper.get('button').classes()).toContain('min-h-control')
    expect(wrapper.get('button').classes()).toContain('text-on-accent')
    expect(wrapper.get('img').attributes('alt')).toContain('Synthetic sample letter')
    expect(wrapper.get('img').attributes('style')).toBeUndefined()
    expect(wrapper.get('img').classes()).not.toContain('invert')
  })

  it('opens a labelled dialog and closes it with its button', async () => {
    wrapper = mount(App, { attachTo: document.body })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const titleId = dialog?.getAttribute('aria-labelledby')
    const descriptionId = dialog?.getAttribute('aria-describedby')
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(titleId ?? '')?.textContent).toBe('Hello from Reka UI')
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('focus management')

    const closeButton = dialog?.querySelector('button')
    expect(closeButton?.textContent?.trim()).toBe('Close dialog')
    closeButton?.click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes the dialog with Escape', async () => {
    wrapper = mount(App, { attachTo: document.body })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
