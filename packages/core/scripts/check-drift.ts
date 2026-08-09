/** Fail when regeneration changes or adds anything under one committed path. */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const target = process.argv[2]
if (target === undefined) {
  throw new TypeError('usage: node scripts/check-drift.ts <git-pathspec>')
}

const root = join(import.meta.dirname, '..', '..', '..')
const safeRoot = root.replaceAll('\\', '/')
const result = spawnSync(
  'git',
  [
    '-c',
    `safe.directory=${safeRoot}`,
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    target,
  ],
  { cwd: root, encoding: 'utf8' },
)

if (result.error !== undefined) {
  throw result.error
}
if (result.status !== 0) {
  process.stderr.write(result.stderr)
  process.exitCode = result.status ?? 1
} else if (result.stdout !== '') {
  process.stderr.write(`regenerated output differs from Git:\n${result.stdout}`)
  process.exitCode = 1
}
