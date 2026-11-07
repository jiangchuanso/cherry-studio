import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { assertLinuxGlibcBaseline, LINUX_GLIBC_BASELINE } = require('../../native/external-app/build.cjs') as {
  assertLinuxGlibcBaseline: (addonPath: string) => void
  LINUX_GLIBC_BASELINE: string
}
const projectRoot = path.resolve(__dirname, '../..')
const tmpDirs: string[] = []

function addonWith(requirements: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-app-glibc-'))
  tmpDirs.push(dir)
  const file = path.join(dir, 'external-app.node')
  fs.writeFileSync(file, `\0${requirements.join('\0')}\0`)
  return file
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('external-app Linux glibc baseline', () => {
  it('builds in an Ubuntu 20.04 image with the focal GdkPixbuf headers package', () => {
    const dockerfile = fs.readFileSync(path.join(projectRoot, 'native/external-app/linux/Dockerfile'), 'utf8')
    expect(LINUX_GLIBC_BASELINE).toBe('2.31')
    expect(dockerfile).toMatch(/^FROM ubuntu:20\.04\b/m)
    expect(dockerfile).toContain('libgdk-pixbuf2.0-dev')
  })

  it('rejects an addon linked against a newer glibc', () => {
    expect(() => assertLinuxGlibcBaseline(addonWith(['GLIBC_2.2.5', 'GLIBC_2.34']))).toThrow(/GLIBC_2\.34/)
  })

  it('accepts an addon within the baseline', () => {
    expect(() => assertLinuxGlibcBaseline(addonWith(['GLIBC_2.2.5', 'GLIBC_2.31']))).not.toThrow()
  })
})
