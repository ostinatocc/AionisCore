# Aionis Runtime Lite Runtime Shell

This directory owns the local runtime shell used to boot Aionis Runtime in development.

Current state:

1. It owns the local runtime shell entrypoint and startup script.
2. It launches the root runtime source tree through `tsx`.
3. It keeps local shell startup behavior isolated from the shared core packages.
4. It does not depend on a copied `dist/index.js` launcher artifact.

Current commands:

```bash
npm --prefix apps/lite run build
npm --prefix apps/lite run start
npm --prefix apps/lite run start:print-env
```

Current runtime model:

1. root `src/index.ts` is the runtime source entrypoint
2. `apps/lite/src/index.js` is the local runtime shell launcher
3. `apps/lite/scripts/start-lite-app.sh` owns local shell startup behavior
4. root `scripts/start-lite.sh` remains a compatibility shim
5. startup runs directly from source and does not require a prebuilt wrapper artifact

Default local identity:

1. local shell startup exports `LITE_LOCAL_ACTOR_ID=local-user` unless overridden
2. replay/playbook routes use that actor when no auth principal is present
3. automation runs also fall back to that actor, so playbook-driven flows work without extra identity payloads

Useful override:

```bash
LITE_LOCAL_ACTOR_ID=lucio npm --prefix apps/lite run start
```

Default sandbox behavior:

1. local shell startup exports `SANDBOX_ENABLED=true`
2. local shell startup exports `SANDBOX_ADMIN_ONLY=false`
3. set `SANDBOX_ADMIN_ONLY=true` when you want to relock sandbox routes behind the admin token

Default local memory lifecycle behavior:

1. Lite exposes `POST /v1/memory/archive/rehydrate`
2. Lite exposes `POST /v1/memory/nodes/activate`
3. the public SDK can call these through `aionis.memory.archive.rehydrate(...)` and `aionis.memory.nodes.activate(...)`
