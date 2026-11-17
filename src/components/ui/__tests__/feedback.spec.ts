import { describe, expect, it, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import UiButton from '../UiButton.vue'
import UiFeedback from '../UiFeedback.vue'
import UiLink from '../UiLink.vue'
import UiStatus from '../UiStatus.vue'

describe('shared status and feedback', () => {
  it.each(['neutral', 'info', 'success', 'warning', 'danger'] as const)(
    'renders meaningful status text for %s without a live announcement',
    (tone) => {
      const wrapper = mount(UiStatus, { props: { label: 'Needs review', tone } })
      expect(wrapper.text()).toBe('Needs review')
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('aria-live')).toBeUndefined()
    },
  )

  it.each(['loading', 'empty', 'error', 'demo-save'] as const)(
    'renders %s content without announcing static feedback',
    (state) => {
      const wrapper = mount(UiFeedback, {
        props: { state, title: 'A clear title', description: 'An explanation.' },
      })
      expect(wrapper.text()).toContain('A clear title')
      expect(wrapper.text()).toContain('An explanation.')
      expect(wrapper.find('[aria-live]').exists()).toBe(false)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    },
  )

  it('hides decorative loading motion from assistive technology and respects reduced motion', () => {
    const wrapper = mount(UiFeedback, {
      props: { state: 'loading', title: 'Loading', description: 'Please wait.' },
    })
    const spinner = wrapper.get('[aria-hidden="true"]')
    expect(spinner.classes()).toContain('motion-safe:animate-spin')
    expect(spinner.classes()).not.toContain('animate-spin')
  })

  it.each([
    ['loading', 'border-border'],
    ['empty', 'border-border'],
    ['error', 'border-danger'],
    ['demo-save', 'border-success'],
  ] as const)('uses only the %s state border', (state, expected) => {
    const wrapper = mount(UiFeedback, {
      props: { state, title: 'Title', description: 'Description' },
    })
    expect(
      wrapper
        .classes()
        .filter((name) => ['border-border', 'border-danger', 'border-success'].includes(name)),
    ).toEqual([expected])
  })

  it('allows polite updates without including actions in the live region', async () => {
    const action = vi.fn<() => void>()
    const wrapper = mount(UiFeedback, {
      props: { state: 'error', title: 'Could not load', description: 'Try again.', announce: true },
      slots: { actions: () => h(UiButton, { onClick: action }, () => 'Retry') },
    })
    const live = wrapper.get('[aria-live="polite"]')
    expect(live.attributes('aria-atomic')).toBe('true')
    expect(live.text()).toContain('Could not load')
    expect(live.find('button').exists()).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(action).toHaveBeenCalledOnce()
  })

  it('supports a working link as a next action', () => {
    const wrapper = mount(UiFeedback, {
      props: { state: 'empty', title: 'Nothing here', description: 'Visit the archive.' },
      slots: { actions: () => h(UiLink, { href: '/' }, () => 'Go to Archive') },
    })
    expect(wrapper.get('a').attributes('href')).toBe('/')
    expect(wrapper.get('a').text()).toBe('Go to Archive')
  })

  it('keeps demo-save feedback visible until its owner removes it', async () => {
    const shown = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          shown.value
            ? h(UiFeedback, {
                state: 'demo-save',
                title: 'Changes applied',
                description: 'Your example has been updated.',
              })
            : null,
      }),
    )
    expect(wrapper.text()).toContain('reset on reload')
    expect(wrapper.text()).toContain('not saved to an archive')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Changes applied')
    shown.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('')
  })
})
