# Lite Shared Governance Runtime Apply Plan

1. Add a shared runtime-apply gate helper in `src/memory/governance-shared.ts`
2. Refactor replay `promote_memory` runtime apply to use it
3. Refactor tools `form_pattern` runtime apply to use it
4. Add a focused contract test for the helper
5. Run:
   - `npx tsc --noEmit`
   - targeted governance tests
   - `npm run -s test:lite`
