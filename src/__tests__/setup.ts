// jsdom has no scrolling implementation; real scroll behavior is checked in Chrome.
if (typeof window !== 'undefined') window.scrollTo = () => {}

// Existing catalog/UI tests operate as a verified synthetic contributor.
// Authentication tests override this adapter to exercise denial, races and recovery.
import { beforeEach, vi } from 'vite-plus/test'
import { authGateway } from '../services/auth'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'
vi.mock('../services/auth', () => ({
  authGateway: {
    identity: vi.fn<typeof authGateway.identity>(),
    access: vi.fn<typeof authGateway.access>(),
    subscribe: vi.fn<typeof authGateway.subscribe>(() => () => {}),
    requestCode: vi.fn<typeof authGateway.requestCode>(),
    verifyCode: vi.fn<typeof authGateway.verifyCode>(),
    google: vi.fn<typeof authGateway.google>(),
    exchange: vi.fn<typeof authGateway.exchange>(),
    signOut: vi.fn<typeof authGateway.signOut>(),
  },
}))
beforeEach(async () => {
  vi.mocked(authGateway.identity)
    .mockReset()
    .mockResolvedValue({ id: 'test-member', email: 'member@example.test' })
  vi.mocked(authGateway.access)
    .mockReset()
    .mockResolvedValue({ id: 'test-archive', name: 'Test archive', role: 'contributor' })
  vi.mocked(authGateway.requestCode)
    .mockReset()
    .mockResolvedValue({ outcome: 'code_requested', resendCooldown: 60 })
  vi.mocked(authGateway.verifyCode).mockReset().mockResolvedValue()
  vi.mocked(authGateway.google).mockReset().mockResolvedValue()
  vi.mocked(authGateway.exchange).mockReset().mockResolvedValue()
  vi.mocked(authGateway.signOut).mockReset().mockResolvedValue()
  await useSession(appPinia).reconcile()
})
