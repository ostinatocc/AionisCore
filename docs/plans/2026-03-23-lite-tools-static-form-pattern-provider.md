# Lite Tools Static Form-Pattern Provider Plan

1. Add a static `form_pattern` governance review provider next to the existing static `promote_memory` provider.
2. Add a Lite env flag for tools feedback provider enablement.
3. Thread the provider into `registerMemoryFeedbackToolRoutes(...)` for `/v1/memory/tools/feedback`.
4. Add one live-path test proving provider fallback can stabilize a pattern anchor without an explicit review result.
5. Run targeted tools tests, `npx tsc --noEmit`, and `npm run -s test:lite`.
