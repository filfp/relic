import { describe, expect, test } from 'bun:test'
import { auditFindings, checkBunfig, checkManifest, fixStatus, lockedVersions, type AuditResult } from './check'

const DAY = 86_400_000
const NOW = Date.parse('2026-11-12T00:00:00Z')

describe('bunfig', () => {
  test('requires exact pins and a 7-day floor', () => {
    expect(checkBunfig(undefined)).toHaveLength(1)
    expect(checkBunfig('[install]\nexact = true\nminimumReleaseAge = 604800\n')).toEqual([])
    expect(checkBunfig('[install]\nexact = true\nminimumReleaseAge = 86400\n')).toHaveLength(1)
    // a key under another table does not count
    expect(checkBunfig('[test]\nexact = true\n[install]\nminimumReleaseAge = 604800\n')).toHaveLength(1)
  })
})

describe('manifest', () => {
  test('blocks ranges, tags, git and trusted scripts; allows workspace and peers', () => {
    const f = checkManifest('package.json', {
      dependencies: { a: '1.2.3', b: '^1.2.3', c: 'latest', d: 'github:o/r', e: 'workspace:*', f: '1.0.0-beta.1' },
      peerDependencies: { react: '>=18' },
      trustedDependencies: ['esbuild'],
    })
    expect(f.map(x => x.message.split(' ')[0])).toEqual(['dependencies.b', 'dependencies.c', 'dependencies.d', 'trustedDependencies'])
  })
})

describe('audit', () => {
  const lock = '    "vite": ["vite@8.1.1", "", {}, "sha"],\n    "x": ["x@1.0.0", "", { "dependencies": { "vite": "8.1.1" } }, "sha"],\n'
  const adv = (url: string, range: string): AuditResult => ({ vite: [{ id: 1, url, title: 't', severity: 'low', vulnerable_versions: range }] })

  test('reads locked versions in the vulnerable range', () => {
    expect(lockedVersions(lock, 'vite', '<8.1.5')).toEqual(['8.1.1'])
  })

  test('a fix past the floor blocks with the version to install', () => {
    const times = { '8.1.1': '2026-01-01T00:00:00Z', '8.1.5': new Date(NOW - 10 * DAY).toISOString() }
    expect(fixStatus('<8.1.5', ['8.1.1'], times, NOW, 7 * DAY)).toEqual({ kind: 'installable', version: '8.1.5' })
    const f = auditFindings(adv('https://x/GHSA-aaaa', '<8.1.5'), lock, [], { vite: times }, NOW)
    expect(f[0]!.level).toBe('error')
    expect(f[0]!.message).toContain('Upgrade to vite@8.1.5')
  })

  test('a fix younger than the floor is a warning naming the day', () => {
    const times = { '8.1.1': '2026-01-01T00:00:00Z', '8.1.5': new Date(NOW - 2 * DAY).toISOString() }
    const f = auditFindings(adv('https://x/GHSA-aaaa', '<8.1.5'), lock, [], { vite: times }, NOW)
    expect(f[0]!.level).toBe('warning')
    expect(f[0]!.message).toContain('2026-11-17')
  })

  test('no fix, or no registry answer, blocks; allowlist skips; stale entries warn', () => {
    expect(auditFindings(adv('https://x/GHSA-aaaa', '<99.0.0'), lock, [], { vite: { '8.1.1': '2026-01-01' } }, NOW)[0]!.level).toBe('error')
    expect(auditFindings(adv('https://x/GHSA-aaaa', '<8.1.5'), lock, [], {}, NOW)[0]!.level).toBe('error')
    const allow = [{ advisory: 'GHSA-aaaa', reason: 'dev only' }, { advisory: 'GHSA-gone', reason: 'old' }]
    const f = auditFindings(adv('https://x/GHSA-aaaa', '<8.1.5'), lock, allow, {}, NOW)
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ level: 'warning', file: '.supply-chain.json' })
  })
})
