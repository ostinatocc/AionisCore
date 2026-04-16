# Aionis Runtime Mainline

Last reviewed: 2026-04-16

Internal status: active internal mainline reference

This repository is the mainline for Aionis Runtime and the Aionis Core kernel that powers it.

## Purpose

This repository carries the kernel and runtime work that defines Aionis Runtime:

1. execution-memory internals
2. replay and workflow learning internals
3. governance and model-client internals
4. benchmark, regression, and evaluation internals
5. Lite runtime, sandbox, operator, and maintenance work

## Mainline Rule

New kernel and runtime work lands here first.

Treat this repository as the place for:

1. runtime implementation
2. SDK and bridge surfaces
3. deeper internal validation surfaces

## Working Rule

When in doubt:

1. build the kernel slice here first
2. stabilize the contract
3. export or package later if needed
