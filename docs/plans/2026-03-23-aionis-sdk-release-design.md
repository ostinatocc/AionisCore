# Aionis Core SDK Surface Design

Date: 2026-03-23

## Goal

Define the SDK release shape for `Aionis Core`.

The SDK should become the primary public developer surface for the core kernel.

## Recommended Positioning

### Recommended Core SDK Positioning

`Aionis Core` should be presented as:

1. an agent continuity kernel
2. a learned kickoff, structured handoff, and replay kernel
3. an SDK for building systems on top of those kernel surfaces

The key claim is:

1. Aionis Core turns prior execution into:
   - better task starts
   - structured resumability
   - reusable replay and playbooks
   - governed memory mutations

## Why SDK First Is The Right Move Now

### Recommended approach

Ship Aionis Core as:

1. kernel routes and contracts
2. SDK surfaces
3. examples

Recommendation:

1. first-party SDK should be the main external surface
2. HTTP routes remain the source of truth
3. SDK becomes the ergonomic developer surface
4. secondary integration layers come later

### Alternatives considered

#### Option A: Keep leading with core routes only

Pros:

1. lowest extra work
2. stays closest to current implementation

Cons:

1. too raw for broader adoption
2. makes Aionis Core feel raw instead of clearly consumable
3. shifts complexity onto integrators

#### Option B: Lead with the Aionis Core SDK

Pros:

1. preserves product ownership
2. matches the current state of the core kernel
3. keeps future integrations downstream instead of upstream
4. easier to document as one coherent mental model

Cons:

1. requires curating a first public API instead of exposing raw everything
2. requires examples and packaging discipline

Recommendation:

1. choose the SDK-first option

## First Public SDK Surface

The first SDK should be small.
It should wrap only the surfaces that are already stable and benchmark-defended.

### SDK shape

Recommended first package:

1. `@ostinato/aionis`

Recommended client:

1. `createAionisClient(...)`

Recommended first modules:

1. `memory.taskStart`
2. `memory.taskStartPlan`
3. `handoff.store`
4. `handoff.recover`
5. `memory.replay.run`
6. `memory.replay.playbooks`

### First API recommendation

Recommended public methods:

```ts
const aionis = createAionisClient({
  baseUrl: "http://127.0.0.1:8787",
});

await aionis.memory.taskStart(...)
await aionis.memory.taskStartPlan(...)
await aionis.handoff.store(...)
await aionis.handoff.recover(...)
await aionis.memory.replay.run.start(...)
await aionis.memory.replay.playbooks.compileFromRun(...)
```

### What should stay out of SDK v1

Do not lead v1 with:

1. every internal governance operation
2. broad admin/control-plane surfaces
3. unstable maintenance operations
4. secondary integration-specific abstractions

Reason:

1. the current technical maturity is strongest around task start, handoff, replay, and current governed live paths
2. v1 should expose the strongest surfaces, not the noisiest ones

## SDK Product Narrative

### Recommended homepage / README headline

Recommended framing:

1. "Aionis Core is an agent continuity kernel and SDK for building systems that start better, resume cleanly, and reuse prior execution."

Shorter variant:

1. "Agent continuity for real systems."

### Recommended first-screen explanation

Recommended three-line explanation:

1. Aionis Core captures execution evidence, not just chat history.
2. It turns prior execution into better starts, structured handoff, and replay reuse.
3. It exposes that behavior through a first-party SDK and core runtime surfaces.

### Recommended capability framing

Lead with:

1. task-start lift
2. structured handoff
3. replay and playbook reuse
4. governed memory

Avoid leading with:

1. pack import/export
2. low-level route count
3. integration matrix
4. generic compatibility claims

## First Example Set

The first examples should prove product value, not surface area.

### Example 1: Quickstart task-start lift

Goal:

1. show that repeated execution becomes better task-start guidance

Flow:

1. seed repeated execution
2. call `taskStart`
3. call `taskStartPlan`
4. show improved first action

### Example 2: Handoff store -> recover

Goal:

1. show structured resumability as a concrete developer experience

Flow:

1. store handoff packet
2. recover handoff packet
3. show execution-ready resume state

### Example 3: Replay compile -> playbook reuse

Goal:

1. show replay-backed workflow reuse

Flow:

1. start run
2. record steps
3. compile playbook
4. run or inspect playbook

### Example 4: Governance shadow run

Goal:

1. show that Aionis Core can compare builtin governance against external governance without changing the public SDK mental model

Flow:

1. run external shadow benchmark or example
2. compare governed outcomes

### Example 5: Minimal continuity loop

Goal:

1. show that Aionis Core is the continuity kernel under a simple system

Flow:

1. task start
2. tool action
3. handoff or replay writeback
4. second run improves due to prior execution

## What To Remove Or Downgrade In Messaging

### Messaging to downgrade

These should move from the core message to a secondary integration appendix:

1. integration-specific launch claims
2. generic compatibility claims
3. route inventory as the primary story

### Messaging to rewrite

Current wording should keep the focus on the core kernel and SDK surface rather than on downstream integrations.

### Product hierarchy to enforce

Recommended hierarchy:

1. Aionis Core
2. Aionis Core SDK
3. Secondary integration layers

Secondary integration layers may exist later, but they should never outrank the SDK in product identity.

## Packaging Recommendation

Short-term recommendation:

1. keep the core repository as the source of truth
2. add an SDK package that wraps stable core HTTP contracts
3. keep examples separate from the core internals

Suggested public package sequence:

1. `@ostinato/aionis`

## Launch Sequence

### Phase 1: SDK-first public baseline

Ship:

1. core quickstart
2. SDK quickstart
3. three to five value-first examples
4. benchmark-backed proof points

### Phase 2: Strengthen trust

Ship:

1. stable benchmark artifact story
2. governance shadow evidence
3. clearer governance docs

### Phase 3: Secondary integration layers

Only after SDK positioning is established:

1. release selected integration packages
2. frame them as integrations, not product identity

## Recommended Next Implementation Steps

### Immediate next step

1. define SDK v1 public method list and response ownership layers

### Next after that

1. rewrite README first screen around SDK identity
2. add `/examples` or `docs/examples` for the first 3 to 5 SDK flows
3. define package/release structure for `@ostinato/aionis`

### Later

1. publish integration strategy as a separate document
2. keep the primary message centered on the core kernel and SDK

## Final Recommendation

Yes, Aionis should move toward an SDK-first release posture.

The current technical state supports it because:

1. the main task-start, handoff, and replay loops are real
2. the governance stack is real
3. the benchmark posture is strong
4. real governance shadow alignment now exists

That means Aionis Core no longer needs to borrow identity from downstream integrations.

The right public story now is:

1. Aionis Core is the continuity kernel
2. the Aionis Core SDK is the first-class developer surface
3. secondary integrations come later
