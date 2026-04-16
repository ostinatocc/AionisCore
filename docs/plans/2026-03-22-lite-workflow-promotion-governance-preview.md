Last reviewed: 2026-04-16

Document status: historical implementation plan

# Lite Workflow Promotion Governance Preview Plan

1. Add workflow-promotion governance preview schemas
2. Add a small workflow-promotion governance helper
3. Attach preview metadata in the stable branch of `workflow-write-projection`
4. Extend route tests to assert preview presence on auto-promoted workflow anchors
5. Run:
   - `npx tsc --noEmit`
   - targeted workflow projection tests
   - `npm run -s test:lite`
