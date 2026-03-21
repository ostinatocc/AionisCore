# Aionis Installer Implementation Plan

**Goal:** Ship the first installer layer that puts a stable `aionis` command onto the user's machine.

**Architecture:** Add a small installer CLI plus one shell wrapper script. The installer writes a user launcher and a tiny install manifest, then defers all real behavior to the existing top-level product CLI.

**Tech Stack:** TypeScript, node:fs, node:path, node:os, node:test, bash.

---

### Task 1: Add installer contracts and manifest

**Files:**
- Create: `/Volumes/ziel/Aionisgo/src/product/aionis-installer.ts`
- Test: `/Volumes/ziel/Aionisgo/scripts/ci/aionis-installer.test.ts`

**Step 1: Define install paths**

Track:

1. install root
2. manifest path
3. launcher path

**Step 2: Define install result**

Return:

1. `created`
2. `updated`
3. `unchanged`

### Task 2: Implement launcher install

**Files:**
- Modify: `/Volumes/ziel/Aionisgo/src/product/aionis-installer.ts`
- Test: `/Volumes/ziel/Aionisgo/scripts/ci/aionis-installer.test.ts`

**Step 1: Write the launcher**

The launcher should delegate to:

```bash
npm --prefix <repo_root> run -s product:aionis -- "$@"
```

**Step 2: Write the manifest**

Persist the repository root and launcher path.

**Step 3: Make it idempotent**

Return `unchanged` when nothing needs to move.

### Task 3: Add installer entrypoints

**Files:**
- Create: `/Volumes/ziel/Aionisgo/scripts/install-aionis.sh`
- Modify: `/Volumes/ziel/Aionisgo/package.json`
- Test: `/Volumes/ziel/Aionisgo/scripts/ci/aionis-installer-entry.test.ts`

**Step 1: Add a shell installer**

Support:

```bash
bash scripts/install-aionis.sh
```

**Step 2: Add a package script**

Add:

1. `product:aionis:install`

### Task 4: Document the installer

**Files:**
- Create: `/Volumes/ziel/Aionisgo/docs/AIONIS_INSTALLER_GUIDE.md`
- Modify: `/Volumes/ziel/Aionisgo/README.md`

**Step 1: Document the one-shot install path**

Show:

1. install
2. verify
3. first launch

### Verification

Run:

```bash
npx tsx --test scripts/ci/aionis-installer.test.ts scripts/ci/aionis-installer-entry.test.ts
npx tsc --noEmit
npm run -s test:lite
```
