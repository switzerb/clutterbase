import { afterEach, describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import UiButton from '../UiButton.vue'
import UiLink from '../UiLink.vue'
import UiInput from '../UiInput.vue'
import UiSelect from '../UiSelect.vue'
import UiDialog from '../UiDialog.vue'

describe('shared controls', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('uses a safe button type, forwards attributes and supports disabled actions', async () => {
    wrapper = mount(UiButton, {
      attrs: { name: 'save', disabled: true },
      slots: { default: 'Save' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('name')).toBe('save')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('min-h-control')
    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('exposes links normally and removes disabled links from navigation', () => {
    wrapper = mount(UiLink, {
      props: { href: '/archive' },
      attrs: { target: '_blank' },
      slots: { default: 'Archive' },
    })
    expect(wrapper.get('a').attributes('href')).toBe('/archive')
    expect(wrapper.get('a').attributes('target')).toBe('_blank')
    wrapper.unmount()
    wrapper = mount(UiLink, {
      props: { href: '/archive', disabled: true },
      slots: { default: 'Archive' },
    })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.get('[aria-disabled="true"]').text()).toBe('Archive')
    expect(wrapper.find('[tabindex]').exists()).toBe(false)
  })

  it('associates input labels, hints, external descriptions and errors and emits edits', async () => {
    wrapper = mount(UiInput, {
      props: {
        label: 'Title',
        modelValue: 'Old',
        hint: 'Use a short title',
        error: 'Enter a title',
      },
      attrs: { name: 'title', required: true, 'aria-describedby': 'external' },
    })
    const input = wrapper.get('input')
    const id = input.attributes('id')
    expect(wrapper.get('label').attributes('for')).toBe(id)
    expect(input.attributes('aria-describedby')).toBe(`external ${id}-hint ${id}-error`)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('required')).toBeDefined()
    expect(wrapper.get(`#${id}-error`).text()).toBe('Error: Enter a title')
    await input.setValue('New')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['New'])
    await wrapper.setProps({ error: undefined })
    expect(input.attributes('aria-invalid')).toBeUndefined()
    expect(input.attributes('aria-describedby')).toBe(`external ${id}-hint`)
  })

  it('uses distinct generated IDs and permits explicit IDs', () => {
    wrapper = mount(
      defineComponent({
        render: () =>
          h('div', [
            h(UiInput, { label: 'First' }),
            h(UiSelect, { label: 'Second' }),
            h(UiInput, { label: 'Third', id: 'explicit' }),
          ]),
      }),
    )
    const fields = wrapper.findAll('input, select')
    const ids = fields.map((field) => field.attributes('id'))
    expect(new Set(ids).size).toBe(3)
    expect(ids[2]).toBe('explicit')
    expect(wrapper.findAll('label').map((label) => label.attributes('for'))).toEqual(ids)
  })

  it('updates external descriptions independently of field props', async () => {
    const description = ref('before')
    wrapper = mount(
      defineComponent({
        render: () =>
          h('div', [
            h(UiInput, {
              label: 'Input',
              hint: 'Hint',
              error: 'Problem',
              'aria-describedby': description.value,
            }),
            h(UiSelect, {
              label: 'Select',
              hint: 'Hint',
              error: 'Problem',
              'aria-describedby': description.value,
            }),
          ]),
      }),
    )
    for (const field of wrapper.findAll('input, select')) {
      const id = field.attributes('id')
      expect(field.attributes('aria-describedby')).toBe(`before ${id}-hint ${id}-error`)
    }
    description.value = 'after'
    await wrapper.vm.$nextTick()
    for (const field of wrapper.findAll('input, select')) {
      const id = field.attributes('id')
      expect(field.attributes('aria-describedby')).toBe(`after ${id}-hint ${id}-error`)
    }
  })

  it('provides a native labeled select with validation and change events', async () => {
    wrapper = mount(UiSelect, {
      props: { id: 'sort', label: 'Sort', modelValue: 'new', error: 'Choose an order' },
      slots: { default: '<option value="new">Newest</option><option value="old">Oldest</option>' },
    })
    const select = wrapper.get('select')
    expect(wrapper.get('label').attributes('for')).toBe('sort')
    expect(select.attributes('aria-describedby')).toBe('sort-error')
    expect(select.attributes('aria-invalid')).toBe('true')
    await select.setValue('old')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['old'])
  })

  it('labels the dialog, focuses it, closes on Escape and returns focus', async () => {
    wrapper = mount(UiDialog, {
      attachTo: document.body,
      props: { trigger: 'Open details', title: 'Details', description: 'Read the details' },
    })
    const trigger = wrapper.get('button').element as HTMLButtonElement
    trigger.focus()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Details',
    )
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Read the details',
    )
    expect(dialog.contains(document.activeElement)).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes the dialog using its visible close action', async () => {
    wrapper = mount(UiDialog, {
      attachTo: document.body,
      props: { trigger: 'Open', title: 'Title', description: 'Description', closeLabel: 'Done' },
    })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const close = document.querySelector<HTMLButtonElement>('[role="dialog"] button')!
    expect(close.textContent).toBe('Done')
    close.click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
