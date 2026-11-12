#!/usr/bin/env bun
// Supply-chain gate shared by Relic and Ranni. Run from the repository root:
//
//   bun .github/actions/supply-chain/check.ts
//
// It blocks when:
// - bunfig.toml does not pin exact versions or does not hold back releases younger than
//   seven days (`[install] exact = true`, `minimumReleaseAge >= 604800`);
// - a package.json asks for a range, a moving tag, a git or URL source, or trusts a
//   dependency's lifecycle scripts (`trustedDependencies`);
// - `bun audit` reports an advisory at any severity that is not on the allowlist and has a
//   fix old enough to install, or has no fix at all;
// - the audit could not reach the registry. An audit that could not ask is not clean.
//
// An advisory whose only fixes are younger than the release floor is a warning naming the
// day the fix can install, and a block again from that day.
//
// Allowlist: `.supply-chain.json` at the root, `{ "audit": { "allowlist": [{ "advisory":
// "GHSA-…", "reason": "…" }] } }`. Every entry needs a reason; an entry that matches nothing
// is a warning so the list shrinks. No dependencies: Bun's own APIs only.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const FLOOR_SECONDS = 604800
const DAY = 86_400_000

export interface Finding {
  level: 'error' | 'warning'
  file: string
  message: string
}

// ---------------------------------------------------------------------------------------
// Policy: bunfig.toml and package.json files

export function checkBunfig(source: string | undefined): Finding[] {
  const file = 'bunfig.toml'
  if (source === undefined) {
    return [{ level: 'error', file, message: `missing; it must set [install] exact = true and minimumReleaseAge = ${FLOOR_SECONDS}.` }]
  }
  const install = /^\[install\]\s*$([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(source)?.[1] ?? ''
  const out: Finding[] = []
  if (!/^\s*exact\s*=\s*true\s*$/m.test(install)) {
    out.push({ level: 'error', file, message: '[install] must set exact = true, so `bun add` pins the exact version.' })
  }
  const age = /^\s*minimumReleaseAge\s*=\s*(\d+)\s*$/m.exec(install)
  if (!age || Number(age[1]) < FLOOR_SECONDS) {
    out.push({
      level: 'error',
      file,
      message: `[install] must set minimumReleaseAge to at least ${FLOOR_SECONDS} (7 days): a fresh release is the window in which a compromised package does its damage.`,
    })
  }
  return out
}

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

export function checkManifest(file: string, pkg: Record<string, unknown>): Finding[] {
  const out: Finding[] = []
  for (const section of SECTIONS) {
    const deps = pkg[section]
    if (!deps || typeof deps !== 'object') continue
    for (const [name, spec] of Object.entries(deps as Record<string, unknown>)) {
      const s = String(spec)
      if (s.startsWith('workspace:')) continue
      // A peer dependency states compatibility for consumers; a range is its meaning.
      if (section === 'peerDependencies') continue
      if (!EXACT.test(s)) {
        out.push({
          level: 'error',
          file,
          message: `${section}.${name} is "${s}"; pin an exact registry version (bun add --exact ${name}@<x.y.z>).`,
        })
      }
    }
  }
  const trusted = pkg.trustedDependencies
  if (Array.isArray(trusted) && trusted.length > 0) {
    out.push({
      level: 'error',
      file,
      message: `trustedDependencies (${trusted.join(', ')}) lets those packages run install scripts. Remove it, or allowlist it here deliberately.`,
    })
  }
  return out
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function manifestPaths(root: string): string[] {
  const rootPkg = readJson(join(root, 'package.json'))
  const ws = rootPkg.workspaces
  const patterns = Array.isArray(ws) ? ws : Array.isArray((ws as { packages?: unknown })?.packages) ? (ws as { packages: string[] }).packages : []
  const paths = ['package.json']
  for (const pattern of patterns as string[]) {
    for (const match of new Bun.Glob(`${pattern.replace(/\/$/, '')}/package.json`).scanSync({ cwd: root })) {
      if (!match.includes('node_modules')) paths.push(match)
    }
  }
  return [...new Set(paths)].sort()
}

// ---------------------------------------------------------------------------------------
// Audit

export interface Advisory {
  id: number
  url: string
  title: string
  severity: string
  vulnerable_versions: string
}
export type AuditResult = Record<string, Advisory[]>
export type Releases = Record<string, Record<string, string>>

export function parseAudit(stdout: string): AuditResult {
  const raw: unknown = JSON.parse(stdout)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`bun audit --json did not print an object: ${stdout.slice(0, 300)}`)
  }
  for (const [pkg, list] of Object.entries(raw as Record<string, unknown>)) {
    const ok = Array.isArray(list) && list.every(a => typeof (a as Advisory)?.severity === 'string' && typeof (a as Advisory)?.url === 'string')
    if (!ok) throw new Error(`bun audit --json: unexpected entry for ${pkg}`)
  }
  return raw as AuditResult
}

export const advisoryId = (a: Advisory) => /GHSA-[\w-]+$/.exec(a.url)?.[0] ?? String(a.id)

/** Versions of `pkg` in bun.lock that fall in `range`. */
export function lockedVersions(lock: string, pkg: string, range: string): string[] {
  const found = new Set<string>()
  const entry = /^\s+"[^"]+": \["((?:@[^@"/]+\/)?[^@"]+)@([^"]+)"/
  for (const line of lock.split('\n')) {
    const m = entry.exec(line)
    if (m && m[1] === pkg && Bun.semver.satisfies(m[2]!, range)) found.add(m[2]!)
  }
  return [...found]
}

export type FixStatus =
  | { kind: 'unknown' | 'none' }
  | { kind: 'installable'; version: string }
  | { kind: 'waiting'; version: string; at: number }

export function fixStatus(range: string, installed: string[], times: Record<string, string> | undefined, now: number, floorMs: number): FixStatus {
  if (!times) return { kind: 'unknown' }
  const newest = installed.reduce((a, b) => (Bun.semver.order(a, b) >= 0 ? a : b), '0.0.0')
  const fixes = Object.keys(times)
    .filter(v => /^\d+\.\d+\.\d+$/.test(v) && !Bun.semver.satisfies(v, range) && Bun.semver.order(v, newest) > 0)
    .sort(Bun.semver.order)
  const ready = fixes.find(v => now - Date.parse(times[v]!) >= floorMs)
  if (ready) return { kind: 'installable', version: ready }
  if (!fixes[0]) return { kind: 'none' }
  return { kind: 'waiting', version: fixes[0], at: Date.parse(times[fixes[0]]!) + floorMs }
}

export interface AllowEntry {
  advisory: string
  reason: string
}

export function auditFindings(
  audit: AuditResult,
  lock: string,
  allowlist: AllowEntry[],
  releases: Releases,
  now: number,
  floorMs = FLOOR_SECONDS * 1000,
): Finding[] {
  const allowed = new Set(allowlist.map(e => e.advisory))
  const seen = new Set<string>()
  const out: Finding[] = []
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  for (const [pkg, advisories] of Object.entries(audit)) {
    for (const a of advisories) {
      const id = advisoryId(a)
      seen.add(id)
      if (allowed.has(id)) continue
      const versions = lockedVersions(lock, pkg, a.vulnerable_versions)
      const what = `${versions.length ? versions.map(v => `${pkg}@${v}`).join(', ') : pkg}: ${id} (${a.severity}) ${a.title}. Vulnerable: ${a.vulnerable_versions}.`
      const status = fixStatus(a.vulnerable_versions, versions, releases[pkg], now, floorMs)
      if (status.kind === 'waiting') {
        out.push({
          level: 'warning',
          file: 'bun.lock',
          message: `${what} Fixed in ${status.version}, which the 7-day release floor holds back until ${day(status.at)}; from then on this blocks.`,
        })
      } else {
        const fix =
          status.kind === 'installable'
            ? `Upgrade to ${pkg}@${status.version} or later.`
            : status.kind === 'none'
              ? 'No fixed release exists; allowlist it in .supply-chain.json with a reason if it is not exploitable here.'
              : 'The registry did not answer for its releases; upgrade out of the range or allowlist it with a reason.'
        out.push({ level: 'error', file: 'bun.lock', message: `${what} ${fix}` })
      }
    }
  }
  for (const entry of allowlist) {
    if (!seen.has(entry.advisory)) {
      out.push({ level: 'warning', file: '.supply-chain.json', message: `Stale allowlist entry ${entry.advisory}: it matches no advisory; remove it.` })
    }
  }
  return out
}

export function readAllowlist(root: string): { allowlist: AllowEntry[]; findings: Finding[] } {
  const file = '.supply-chain.json'
  const path = join(root, file)
  if (!existsSync(path)) return { allowlist: [], findings: [] }
  const raw = readJson(path) as { audit?: { allowlist?: unknown } }
  const list = raw.audit?.allowlist ?? []
  if (!Array.isArray(list)) return { allowlist: [], findings: [{ level: 'error', file, message: 'audit.allowlist must be a list.' }] }
  const allowlist: AllowEntry[] = []
  const findings: Finding[] = []
  for (const e of list as Partial<AllowEntry>[]) {
    if (typeof e?.advisory !== 'string' || typeof e?.reason !== 'string' || !e.reason.trim()) {
      findings.push({ level: 'error', file, message: `Allowlist entry ${JSON.stringify(e)} needs an advisory id and a reason.` })
    } else allowlist.push({ advisory: e.advisory, reason: e.reason })
  }
  return { allowlist, findings }
}

async function fetchReleases(packages: string[]): Promise<Releases> {
  const out: Releases = {}
  await Promise.all(
    packages.map(async pkg => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2f')}`, { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) return
        const { time } = (await res.json()) as { time?: Record<string, string> }
        if (time) out[pkg] = time
      } catch {
        // Unanswered: its advisories keep their blocks.
      }
    }),
  )
  return out
}

// ---------------------------------------------------------------------------------------

async function main(root: string): Promise<number> {
  const findings: Finding[] = []
  const bunfig = join(root, 'bunfig.toml')
  findings.push(...checkBunfig(existsSync(bunfig) ? readFileSync(bunfig, 'utf8') : undefined))
  for (const file of manifestPaths(root)) findings.push(...checkManifest(file, readJson(join(root, file))))

  const { allowlist, findings: allowFindings } = readAllowlist(root)
  findings.push(...allowFindings)

  const res = spawnSync(process.execPath, ['audit', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  try {
    if (res.status !== 0 && res.status !== 1) throw new Error(`exited ${res.status ?? res.signal}`)
    const audit = parseAudit(res.stdout)
    const lock = readFileSync(join(root, 'bun.lock'), 'utf8')
    findings.push(...auditFindings(audit, lock, allowlist, await fetchReleases(Object.keys(audit)), Date.now()))
  } catch (error) {
    findings.push({
      level: 'error',
      file: 'bun.lock',
      message: `bun audit produced no result (registry unreachable?): ${String(error)} ${(res.stderr ?? '').trim().slice(-500)}`,
    })
  }

  const ci = process.env.GITHUB_ACTIONS === 'true'
  for (const f of findings) {
    console.log(ci ? `::${f.level} file=${f.file}::${f.message}` : `${f.level === 'error' ? 'BLOCK' : 'warn '}  ${f.file}: ${f.message}`)
  }
  const blocks = findings.filter(f => f.level === 'error').length
  console.log(blocks ? `Supply chain: ${blocks} blocking finding(s).` : `Supply chain: clean${findings.length ? ` (${findings.length} warning(s))` : ''}.`)
  return blocks ? 1 : 0
}

if (import.meta.main) process.exit(await main(process.cwd()))
