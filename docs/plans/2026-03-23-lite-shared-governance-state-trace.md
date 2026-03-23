# Lite Shared Governance State Trace Plan

1. Add a shared stateful decision-trace helper in `src/memory/governance-shared.ts`
2. Refactor replay decision-trace assembly to use it
3. Refactor tools feedback decision-trace assembly to use it
4. Refactor workflow promotion decision-trace assembly to use it
5. Add a focused contract test for the helper
6. Run:
   - `npx tsc --noEmit`
   - targeted governance tests
   - `npm run -s test:lite`
