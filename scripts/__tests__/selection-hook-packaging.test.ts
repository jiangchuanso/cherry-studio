import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { getNativeModuleFilters } from '../packaging/before-pack'

const projectRoot = path.join(import.meta.dirname, '..', '..')

describe('selection-hook packaging', () => {
  // node-gyp-build resolves build/Release before prebuilds/, so the packaged tree must drop the
  // cross-compiled rebuild and keep the per-arch prebuilds — the reverse shipped an x86-64
  // .node inside the arm64 packages, where it can never load (#20530).
  it('ships the per-arch prebuilds instead of the cross-compiled rebuild', () => {
    const config = parse(readFileSync(path.join(projectRoot, 'electron-builder.yml'), 'utf8')) as {
      files?: string[]
    }

    const selectionHookPatterns = (config.files ?? []).filter((entry) => entry.includes('node_modules/selection-hook/'))

    expect(selectionHookPatterns).toContain('!node_modules/selection-hook/build/**')
    expect(selectionHookPatterns.some((entry) => entry.includes('/prebuilds/'))).toBe(false)
  })

  // Upstream selection-hook 2.1.1 linux-* prebuilds need GLIBC_2.38, above the Kylin V10 SP1
  // (glibc 2.31) floor, and no older-linked build exists to ship instead — so Linux packages
  // omit the whole module and SelectionService degrades to "selection assistant unavailable".
  it.each(['linux', 'linuxmusl'])('omits the module entirely from %s packages', (platform) => {
    const arm64 = getNativeModuleFilters(platform, 'arm64')
    const x64 = getNativeModuleFilters(platform, 'x64')

    expect(arm64).toContain('!**/node_modules/selection-hook/**')
    expect(x64).toContain('!**/node_modules/selection-hook/**')
  })

  it.each([
    ['darwin', 'arm64'],
    ['darwin', 'x64'],
    ['win32', 'arm64'],
    ['win32', 'x64']
  ])('keeps only the %s %s prebuild elsewhere', (platform, arch) => {
    const filters = getNativeModuleFilters(platform, arch)

    expect(filters).not.toContain('!**/node_modules/selection-hook/**')
    expect(filters).toContain(`!**/node_modules/selection-hook/prebuilds/!(${platform}-${arch})/**`)
  })
})
