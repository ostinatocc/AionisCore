# Lite Shared Promote-Memory Governance Runner Plan

1. Add a small shared `promote_memory` governance runner in `src/memory`
   - build packet
   - pass optional review result
   - evaluate admissibility
   - delegate policy-effect and decision-trace shaping back to call sites

2. Refactor replay repair review to use the shared runner

3. Refactor workflow promotion preview to use the shared runner

4. Add a focused contract test for the shared runner

5. Run:
   - `npx tsc --noEmit`
   - targeted governance/workflow tests
   - `npm run -s test:lite`
