import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount rendered trees between tests (no Vitest globals are enabled).
afterEach(() => cleanup())
