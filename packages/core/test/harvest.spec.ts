import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const FIXTURE = join(import.meta.dirname, 'fixtures', 'vectors.json')

describe('the harvest module', () => {
  it('loads the corpus contract without changing the fixture', async () => {
    const before = readFileSync(FIXTURE, 'utf8')
    const modified = statSync(FIXTURE).mtimeMs
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await import('../scripts/corpus.ts')
      expect(readFileSync(FIXTURE, 'utf8')).toBe(before)
      expect(statSync(FIXTURE).mtimeMs).toBe(modified)
      expect(log).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })

  it('does nothing until its command is called', async () => {
    const before = readFileSync(FIXTURE, 'utf8')
    const modified = statSync(FIXTURE).mtimeMs
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await import('../scripts/harvest.ts')
      expect(readFileSync(FIXTURE, 'utf8')).toBe(before)
      expect(statSync(FIXTURE).mtimeMs).toBe(modified)
      expect(log).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })
})
