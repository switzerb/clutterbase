import { describe, expect, it, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UploadView from '../views/UploadView.vue'

describe('illustrative upload', () => {
  it('labels the native selection and separates simulated independent outcomes from real files', () => {
    const wrapper = mount(UploadView)
    expect(wrapper.get('label[for="upload-files"]').text()).toBe('Choose files from your device')
    expect(wrapper.get('#upload-files').attributes('type')).toBe('file')
    expect(wrapper.get('#upload-files').attributes('multiple')).toBeDefined()
    expect(wrapper.get('#upload-files').attributes('aria-describedby')).toBe('selection-help')
    expect(wrapper.text()).toContain('Uploads are not connected')
    expect(wrapper.text()).toContain('does not transfer files')
    expect(wrapper.text()).toContain('not results for your selected files')
    const examples = wrapper.findAll('section')[1]!.findAll('li')
    expect(examples.map((item) => item.text())).toEqual([
      'example-garden-photo.jpgSimulated complete',
      'example-family-letter.pdfSimulated failed',
      'example-postcard.jpgSimulated waiting',
    ])
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(0)
    wrapper.unmount()
  })

  it('shows only selected filenames without reading or transferring files', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const read = vi.spyOn(FileReader.prototype, 'readAsText')
    const wrapper = mount(UploadView)
    const input = wrapper.get('#upload-files')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['private bytes'], 'local.txt')],
    })
    await input.trigger('change')
    expect(wrapper.text()).toContain('Selected locally only — not uploaded')
    expect(wrapper.text()).toContain('local.txt')
    expect(wrapper.text()).not.toContain('private bytes')
    expect(wrapper.findAll('section')[1]!.text()).not.toContain('local.txt')
    expect(fetch).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
    wrapper.unmount()
    vi.restoreAllMocks()
  })
})
