Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Shared Governance Pipeline Plan

1. Add a tiny shared governance helper in `src/memory`
   - shared stage type
   - stage-order builder
   - reason-code builder
   - runtime-apply stage append

2. Refactor replay governance trace assembly to use the helper

3. Refactor tools-feedback governance trace assembly to use the helper

4. Add a small contract test for shared stage/reason behavior

5. Run:
   - `npx tsc --noEmit`
   - targeted governance tests
   - `npm run -s test:lite`
