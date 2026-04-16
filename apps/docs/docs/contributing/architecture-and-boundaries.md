---
title: Architecture And Boundaries
slug: /contributing/architecture-and-boundaries
---

# Architecture and boundaries

If you are contributing to Aionis Runtime or the Aionis Core kernel beneath it, the most important rule is to preserve the product boundary.

The repository is not meant to become a vague catch-all for every agent feature. The kernel focus remains:

1. learned kickoff quality
2. handoff integrity and recovery quality
3. replay and playbook quality
4. execution-memory and governance substrate quality

## Best reads for contributors

- [RUNTIME_MAINLINE.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/RUNTIME_MAINLINE.md)
- [AIONIS_PRODUCT_DEFINITION_V1.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/AIONIS_PRODUCT_DEFINITION_V1.md)
- [OPEN_CORE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/OPEN_CORE_BOUNDARY.md)
- [LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_ARCHITECTURE_AND_COMPLETION.md)
- [LOCAL_RUNTIME_SOURCE_BOUNDARY.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/LOCAL_RUNTIME_SOURCE_BOUNDARY.md)
- [src/runtime-entry.ts](https://github.com/ostinatocc/AionisCore/blob/main/src/runtime-entry.ts)
- [src/app/runtime-services.ts](https://github.com/ostinatocc/AionisCore/blob/main/src/app/runtime-services.ts)
- [adr/README.md](https://github.com/ostinatocc/AionisCore/blob/main/docs/adr/README.md)

## What stays out of the main public docs path

The docs site intentionally does not place these at the center of the navigation:

- implementation plans
- migration sketches
- cleanup plans
- deep archive material

Those materials still matter. They are just not the right entrypoint for first-time users.
