# Aionis Core Mainline

`Cognary/Aionis` is the mainline repository for Aionis Core.

## Purpose

This repository carries the kernel work that defines Aionis Core:

1. execution-memory internals
2. replay and workflow learning internals
3. governance and model-client internals
4. benchmark, regression, and evaluation internals
5. sandbox, operator, and maintenance runtime work

## Mainline Rule

New kernel work lands here first.

Treat this repository as the place for:

1. core runtime implementation
2. core SDK and bridge surfaces
3. deeper internal validation surfaces

## Working Rule

When in doubt:

1. build the kernel slice here first
2. stabilize the contract
3. export or package later if needed
