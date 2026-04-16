Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Isolated Real Validation Plan

Date: 2026-03-23

## Intent

Make real Lite validation feel like a product-runtime check, not an ad hoc collection of local commands and repo-local artifact paths.

## Plan

1. Add external workdir support to `scripts/lite-smoke.sh`
2. Add `scripts/lite-real-validation.sh` as the one-shot real validation entrypoint
3. Add `validate:lite:real` to root `package.json`
4. Update testing docs so the default story points at the isolated command and external artifacts
5. Run one real validation in a fresh directory outside the repository

## Expected Output Shape

The isolated workdir should contain:

1. `smoke-default/`
2. `smoke-local-process/`
3. `benchmark/`
4. `validation-summary.md`

That directory becomes the reviewable record for a real validation run, without dirtying the repository.
