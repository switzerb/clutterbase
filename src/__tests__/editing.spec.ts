import { afterEach, describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { archiveItems, demoSavedItems } from '../data/archive'
import { createAppRouter } from '../router'

const original = JSON.parse(JSON.stringify(archiveItems)) as typeof archiveItems
afterEach(() => {
  archiveItems.splice(0, archiveItems.length, ...structuredClone(original))
  demoSavedItems.clear()
})

async function open(path = '/archive/summer-letter') {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('demo editing', () => {
  it('opens established values without accepting AI and cancels pending changes', async () => {
    const { wrapper } = await open()
    await wrapper.get('#edit-details').trigger('click')
    expect((wrapper.get('#edit-title').element as HTMLInputElement).value).toBe(
      'A letter from summer camp',
    )
    expect((wrapper.get('#edit-approximateDate').element as HTMLInputElement).value).toBe(
      'Possibly late 1960s',
    )
    expect(document.activeElement?.id).toBe('edit-title')
    await wrapper.get('#edit-title').setValue('Unsaved')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(wrapper.get('h1').text()).toBe('A letter from summer camp')
    expect(document.activeElement?.id).toBe('edit-details')
    await wrapper.get('#edit-details').trigger('click')
    expect((wrapper.get('#edit-title').element as HTMLInputElement).value).toBe(
      'A letter from summer camp',
    )
    wrapper.unmount()
  })

  it('saves optional values, updates titles and collection, and keeps feedback on return', async () => {
    const { wrapper, router } = await open()
    await wrapper.get('#edit-details').trigger('click')
    await wrapper.get('#edit-title').setValue('  Revised letter  ')
    await wrapper.get('#edit-people').setValue(' Sam, , Jo ')
    await wrapper.get('#edit-approximateDate').setValue('')
    await wrapper.get('#edit-description').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Revised letter')
    expect(document.title).toBe('Revised letter · Clutterbase')
    expect(wrapper.text()).toContain('Sam, Jo')
    expect(wrapper.text()).toContain('reset on reload')
    expect(wrapper.text()).toContain('not saved to an archive')
    expect(document.activeElement?.id).toBe('edit-details')
    await router.push('/')
    await flushPromises()
    expect(wrapper.text()).toContain('Revised letter')
    await router.push('/archive/summer-letter')
    await flushPromises()
    expect(wrapper.text()).toContain('Demo changes saved')
    expect(wrapper.text()).toContain('has not been added')
    wrapper.unmount()
  })

  it('uses filename for whitespace title and permits all optional fields empty', async () => {
    const { wrapper } = await open()
    await wrapper.get('#edit-details').trigger('click')
    for (const id of ['title', 'people', 'approximateDate', 'description'])
      await wrapper.get(`#edit-${id}`).setValue('  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('summer-letter.pdf')
    expect(document.title).toBe('summer-letter.pdf · Clutterbase')
    expect(wrapper.text()).not.toContain('Possibly late 1960s')
    wrapper.unmount()
  })

  it('links validation errors without losing input and preserves draft on query navigation', async () => {
    const { wrapper, router } = await open()
    await wrapper.get('#edit-details').trigger('click')
    const long = 'x'.repeat(201)
    await wrapper.get('#edit-title').setValue(long)
    await wrapper.get('#edit-description').setValue('y'.repeat(2001))
    await router.push('/archive/summer-letter?example=1')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('#edit-title').attributes('aria-describedby')).toContain('edit-title-error')
    expect(wrapper.get('#edit-description').attributes('aria-describedby')).toBe(
      'edit-description-error',
    )
    expect((wrapper.get('#edit-title').element as HTMLInputElement).value).toBe(long)
    expect(document.activeElement?.id).toBe('edit-title')
    expect(wrapper.get('h1').text()).toBe('A letter from summer camp')
    wrapper.unmount()
  })
})
