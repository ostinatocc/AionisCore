# Aionis Runtime Docs Maintenance

Last reviewed: 2026-04-16

Document status: living docs maintenance policy

This file defines how documentation is maintained in this repository.

## 1. Document classes

The repository has three practical documentation classes:

1. living public docs
2. living internal code-aligned docs
3. archive or design-history docs

The current classification inventory lives in [DOCUMENTATION_TAXONOMY.md](DOCUMENTATION_TAXONOMY.md).

## 2. What must stay aligned with code

These classes are expected to stay aligned with the current repository state:

1. public product docs
2. public technical and integration docs
3. docs site source under `apps/docs`
4. internal code-aligned contract docs
5. package and example READMEs that document current behavior

When routes, contracts, package surfaces, startup flow, or runtime boundaries change, these docs should be reviewed in the same change window.

## 3. What is allowed to be historical

These classes are allowed to preserve older framing, numbers, or earlier design intent:

1. ADRs
2. plan documents
3. release notes
4. audits
5. migration sketches
6. strategy-status snapshots

Those files are still useful, but they are not canonical implementation references unless a living document explicitly says so.

## 4. Required status markers

Archive or design-history documents should declare their status near the top of the file with one of these labels:

1. `Document status: ...`
2. `Historical status: ...`
3. `Internal status: ...`

ADRs and plan indexes should also state clearly that they are archive material.

## 5. Removed docs policy

Removed obsolete docs must not be referenced from living public docs, package READMEs, examples, or docs-site source.

The current removed-doc list is:

1. `docs/FULL_SDK_QUICKSTART.md`
2. `LITE_REPO_BOOTSTRAP.md`
3. `REPO_CUTOVER.md`

If a removed file needs to be mentioned for repository history, keep that mention inside taxonomy or maintenance docs only.

## 6. Validation

Use this command before finishing docs work:

```bash
npm run docs:check
```

That command currently does two things:

1. rejects forbidden references to removed docs in living doc surfaces
2. rebuilds the VitePress site

## 7. Scope of docs check

`docs:check` is intentionally lightweight. It is not a semantic diff against the entire codebase.

It is meant to catch the most expensive regression classes:

1. stale references to removed docs
2. missing archive markers on files that are intentionally historical
3. broken docs-site build output

If a change affects runtime contracts, route availability, startup assembly, or package APIs, human review is still required.
