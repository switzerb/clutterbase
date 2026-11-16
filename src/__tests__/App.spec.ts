import { afterEach, describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'

describe('navigation shell', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  async function open(path: string) {
    const router = createAppRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    await flushPromises()
    return router
  }

  it('opens Archive with a skip link, main landmark and current destination', async () => {
    await open('/')
    expect(wrapper!.get('main h1').text()).toBe('Archive')
    expect(wrapper!.get('a[href="#main"]').text()).toBe('Skip to main content')
    expect(wrapper!.get('nav a[aria-current="page"]').text()).toBe('Archive')
    expect(document.title).toBe('Archive · Clutterbase')
  })

  it('updates current destination, title and heading focus on navigation', async () => {
    const router = await open('/')
    await router.push('/family')
    await flushPromises()
    expect(wrapper!.get('nav a[aria-current="page"]').text()).toBe('Family')
    expect(document.title).toBe('Family · Clutterbase')
    expect(document.activeElement).toBe(wrapper!.get('h1').element)
    await router.push('/upload')
    await flushPromises()
    expect(wrapper!.get('nav a[aria-current="page"]').text()).toBe('Upload files')
  })

  it.each([
    ['/archive/sample-item', 'Sample item', 'Archive'],
    ['/archive/sample-item/', 'Sample item', 'Archive'],
    ['/archive/sample-item/extra', 'Page not found', null],
    ['/archive/missing', 'Item not found', 'Archive'],
    ['/missing', 'Page not found', null],
  ])('handles direct route %s', async (path, heading, current) => {
    await open(path!)
    expect(wrapper!.get('h1').text()).toBe(heading)
    expect(document.title).toBe(`${heading} · Clutterbase`)
    const active = wrapper!.find('nav a[aria-current="page"]')
    expect(active.exists() ? active.text() : null).toBe(current)
    expect(wrapper!.find('main a[href="/"]').exists()).toBe(true)
  })

  it.each([
    ['/inbox', 'Inbox', 'prototype placeholder'],
    ['/upload', 'Upload files', 'does not transfer files'],
  ])('loads %s directly with its title and placeholder', async (path, heading, placeholder) => {
    await open(path)
    expect(wrapper!.get('h1').text()).toBe(heading)
    expect(wrapper!.get('main').text()).toContain(placeholder)
    expect(document.title).toBe(`${heading} · Clutterbase`)
  })

  it('does not change focus or input on query-only navigation', async () => {
    const router = await open('/')
    const input = document.createElement('input')
    input.value = 'kept text'
    wrapper!.get('main').element.append(input)
    input.focus()
    await router.push('/?q=example')
    await flushPromises()
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('kept text')
    input.remove()
  })

  it('updates title and focus when a missing item changes to the known item', async () => {
    const router = await open('/archive/missing')
    await router.push('/archive/sample-item')
    await flushPromises()
    expect(wrapper!.get('h1').text()).toBe('Sample item')
    expect(document.title).toBe('Sample item · Clutterbase')
    expect(document.activeElement).toBe(wrapper!.get('h1').element)
  })
})
