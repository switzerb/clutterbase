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

  it('renders the hello-world page', () => {
    wrapper = mount(App)
    expect(wrapper.get('h1').text()).toBe('Hello, Clutterbase.')
    expect(wrapper.get('button').text()).toBe('Open dialog')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
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
