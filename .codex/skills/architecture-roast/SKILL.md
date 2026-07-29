---
name: architecture-roast
description: Challenge and clarify architecture, simulation, domain, and system-design decisions before writing implementation or documentation. Use when a user asks for a critical “roast”, wants assumptions stress-tested, is defining a new subsystem, or needs unresolved decisions distilled into an approved summary.
---

# Architecture Roast

## Overview

Expose the decisions that make a design coherent, deterministic, scalable, and documentable. Be direct and constructive; challenge assumptions, not the user.

## Workflow

1. Read the relevant project documentation and extract established constraints. Treat it as the source of truth.
2. Identify the smallest set of unresolved decisions that affect correctness, ownership, time, state, consistency, lifecycle, or scale.
3. Ask focused questions in a candid technical tone. Explain the failure mode behind each question when it is non-obvious. Do not overwhelm the user with speculative detail.
4. Challenge contradictions directly. Distinguish product intent, authoritative domain state, cache/rendering state, commands, queries, and implementation choices.
5. Do not draft the target document while material decisions remain unresolved unless the user explicitly asks for assumptions.
6. Once sufficient information exists, produce a short, precise summary of the proposed model and ask for confirmation.
7. Only after confirmation, write the documentation, update any persistent project context required by repository instructions, validate the change, and report whether it is committed.

## Critical Checks

- Ask who is authoritative for each state transition.
- Make ordering, atomicity, cancellation, and failure behavior explicit for concurrent or time-based systems.
- Separate source of truth from cache, replication, rendering, and client prediction.
- Ask what happens while an actor, player, region, or cache is inactive.
- Separate a persistent entity from a role, group, status, view, or temporary relation.
- Require a concrete definition for ownership, identity, lifecycle, and boundaries.
- Surface performance assumptions early, but do not replace domain rules with premature optimization.

## Tone and Scope

- Use “roast” to mean rigorous, candid design review; never be insulting or performative.
- Prefer a few decision-changing questions over a long checklist.
- Preserve choices already confirmed by the user. Do not reopen them without identifying a concrete conflict.
- Label decisions intentionally deferred to a later document; do not invent them to make the current document appear complete.
- Keep the confirmation summary short enough for the user to audit line by line.
