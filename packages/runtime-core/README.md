# @aionis/runtime-core

Shared runtime-core boundary for the current `Aionis` Lite repository and the full `AionisPro` repository.

This package is intentionally small at first. Its purpose is to define the stable shared boundary before moving implementation under it.

Initial responsibilities:

1. shared runtime ownership metadata
2. shared-surface identifiers
3. split-boundary contracts used during the Lite repo extraction
4. explicit separation between the local automation kernel and server-only automation orchestration

Later phases can move bootstrapping and runtime implementation here once the boundary is stable.
