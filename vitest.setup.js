import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no ResizeObserver; Recharts ResponsiveContainer needs it (sizes stay 0).
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => cleanup())