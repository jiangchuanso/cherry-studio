---
description: Linux packaging flow using pinned better-sqlite3 prebuilds, with build commands and prebuild update steps
sources:
  - scripts/linux-native
---

# Linux Packaging

Linux packages use x64 and ARM64 `better-sqlite3` prebuilds from the pinned
[`CherryHQ/cherry-studio-better-sqlite3`](https://github.com/CherryHQ/cherry-studio-better-sqlite3) GitHub Release.

## Build

```bash
# Build both architectures
pnpm build:linux

# Build one architecture
pnpm build:linux:x64
pnpm build:linux:arm64
```

The first build requires network access to populate the Git-ignored `scripts/linux-native/prebuilt/` cache. Cherry
Studio packaging itself does not require Docker or QEMU; those tools are only needed when publishing new prebuilds
from the separate repository.

## Packaging Flow

1. `beforePack` downloads the target artifact and verifies its pinned Release checksum.
2. electron-builder performs its normal native dependency rebuild.
3. `afterPack` verifies the Electron ABI, module version, ELF architecture, checksum, and maximum
   GLIBC/GLIBCXX/CXXABI requirements before replacing the packaged `better_sqlite3.node`.

A missing, stale, or incompatible artifact stops packaging.

## Modules Not Shipped on Linux

`selection-hook` — the cross-app text-selection hook behind the selection assistant — is excluded from Linux
packages by `modulesUnavailableOnLinux` in `scripts/packaging/before-pack.js`. Its upstream `linux-*` prebuilds
are linked against GLIBC_2.38, above the Kylin Desktop V10 SP1 floor (glibc 2.31), and the `ubuntu-latest` runner
can only rebuild against an even newer glibc, so no compatible build exists to ship. `SelectionService` loads the
module lazily behind a `require()` that already catches the failure and switches `feature.selection.enabled` back
off, so Linux users simply do not get the selection assistant. Windows and macOS keep the per-arch prebuilds.

To restore it on Linux, publish glibc-2.28-compatible `selection-hook` prebuilds the way `better-sqlite3` does and
override the packaged `.node` in `afterPack` instead of widening this exclusion.

## Updating the Prebuild

When Electron or `better-sqlite3` changes:

1. Publish a verified Release from the prebuild repository.
2. Update `scripts/linux-native/release.json` with the exact tag, filenames, metadata, and SHA-256 values.

Never point application builds at a floating `latest` Release.
