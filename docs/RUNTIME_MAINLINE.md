# Runtime Mainline

`Cognary/Aionis-runtime` is the private runtime mainline for Aionis.

## Purpose

This repository exists so the strongest Aionis runtime work can continue without forcing the public SDK/demo repository to carry the full runtime implementation surface.

Treat this repo as the place for:

1. execution-memory internals
2. replay and workflow learning internals
3. governance/model-client internals
4. benchmark, regression, and evaluation internals
5. sandbox, operator, and maintenance runtime work

## Relationship To Public Repo

The public repo lives at `Cognary/Aionis`.

That repo should stay focused on:

1. `@aionis/sdk`
2. examples and quickstart
3. public docs and release notes
4. the `sdk_demo` runtime shell

This repo should stay focused on:

1. the real runtime mainline
2. moat-bearing runtime implementation
3. deeper internal validation surfaces

## Export Rule

Do not export runtime work to the public repo by default.

Only mirror changes back when they are:

1. required for the public SDK contract
2. required for the public demo shell
3. clearly safe to expose

## Working Rule

When in doubt:

1. build it here first
2. decide later whether the public repo actually needs it
