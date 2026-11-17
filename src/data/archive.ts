import garden from '../assets/archive/garden.svg'
import letter from '../assets/archive/letter.svg'

export type ArchiveItem = {
  id: string
  filename: string
  title?: string
  uploadedAt: string
  type: 'photo' | 'pdf'
  people?: string[]
  approximateDate?: string
  description?: string
  pageCount?: number
  aiSuggestion?: string
  preview: { state: 'ready'; src: string } | { state: 'missing' | 'processing' | 'failed' }
}

// All content and images are invented for the public demo; timestamps are fixed for discovery.
export const archiveItems: ArchiveItem[] = [
  {
    id: 'garden-afternoon',
    filename: 'garden-afternoon.svg',
    title: 'An afternoon in the garden',
    uploadedAt: '2025-05-14T12:00:00Z',
    type: 'photo',
    people: ['Mara', 'Alex'],
    approximateDate: 'Around 1975',
    description: 'A sunny afternoon among the garden paths.',
    preview: { state: 'ready', src: garden },
  },
  {
    id: 'summer-letter',
    filename: 'summer-letter.pdf',
    title: 'A letter from summer camp',
    uploadedAt: '2025-04-02T12:00:00Z',
    type: 'pdf',
    people: ['Mara'],
    approximateDate: 'Possibly late 1960s',
    description: 'A three-page note about a summer away.',
    pageCount: 3,
    aiSuggestion: 'Possibly written in 1968.',
    preview: { state: 'ready', src: letter },
  },
  {
    id: 'long-filename',
    filename:
      'a-very-long-filename-for-an-unidentified-summer-gathering-by-the-garden-gate-with-friends-and-neighbors.jpg',
    uploadedAt: '2025-03-01T12:00:00Z',
    type: 'photo',
    preview: { state: 'missing' },
  },
  {
    id: 'letter-processing',
    filename: 'note-in-progress.pdf',
    title: 'A note in progress',
    uploadedAt: '2025-02-01T12:00:00Z',
    type: 'pdf',
    pageCount: 2,
    preview: { state: 'processing' },
  },
  {
    id: 'photo-failed',
    filename: 'porch-photo.jpg',
    title: 'On the porch',
    uploadedAt: '2025-01-01T12:00:00Z',
    type: 'photo',
    approximateDate: 'Date uncertain',
    preview: { state: 'failed' },
  },
]

export const displayTitle = (item: ArchiveItem) => item.title || item.filename
export const findArchiveItem = (id: unknown) => archiveItems.find((item) => item.id === id)
