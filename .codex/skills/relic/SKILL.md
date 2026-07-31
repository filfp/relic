---
name: relic
description: Use Relic's shared project knowledge to challenge ideas, remove ambiguity, review specifications and implementation, diagnose or fix behavior, implement changes, and preserve developer-approved current knowledge. Use when a repository contains .relic/RELIC.md, the developer asks to use Relic or requests a roast, or work may create or change durable requirements, architecture, delivery scope, or reusable project knowledge.
---

# Relic

Use the project's current knowledge to reduce the decision space around the developer's
task. Be candid and evidence-led. Relic surrounds the requested work; it is not a
workflow the developer must complete before work can continue.

## Enter Through Project Knowledge

1. Honor the repository's `AGENTS.md` and other project instructions.
2. If those instructions have not already routed the task through Relic, read
   `.relic/RELIC.md` as the first Relic context step.
3. Start from the target named by the developer. Follow only relevant links and expand
   context with the frontend, Relic search, filesystem search, symbol search, or other
   native tools as the task requires.
4. Treat code as evidence of present behavior and Relic documents as current best
   knowledge of intent, contracts, decisions, and structure. Investigate a divergence;
   do not give either source universal precedence.

Do not load the whole corpus by default or require `relic search` as a gateway.

If `.relic/RELIC.md` is missing or malformed, report that focused discovery problem.
Continue with repository-native evidence when the requested work can still proceed; do
not invent topology.

## Reduce the Decision Space

Scale scrutiny to uncertainty, consequence, and reversibility. Keep a local, clear change
lightweight. Examine authority, persistence, public contracts, security, concurrency,
irreversible state, and cross-boundary effects more deeply when they matter.

Use discovery, readiness, compliance, operational resilience, decomposition, fixes, and
implementation as optional internal lenses. Combine or omit them. Never ask the
developer to select a mode and never turn them into ordered phases.

For each material finding:

- classify it as a contradiction, blocking fork, derivable solution, accepted risk,
  implementation detail, future improvement, or non-problem;
- calibrate severity from P0, which invalidates or blocks the current scope, through P4,
  which is informational;
- cite concrete repository or runtime evidence;
- state the failure mode or consequence;
- recommend a course before asking for a decision.

Resolve a finding directly when established constraints leave one coherent solution.
Ask only when multiple valid choices materially change behavior, authority, ownership,
or scope, or when evidence cannot establish product intent. Group dependent questions
into a small batch and resolve the decisions that eliminate later questions first.

Preserve confirmed decisions unless concrete new evidence contradicts them. Separate
current-scope needs from generality or improvements that can wait. Do not produce edge
cases merely to appear critical, block useful drafts on non-material uncertainty, or
reopen settled architecture for aesthetic preference.

During a long analysis, maintain a temporary ledger of confirmed and derived decisions,
open forks, accepted risks, deferrals, and affected documents. Keep it in the
conversation unless the developer explicitly requests a handoff or knowledge update.

## Continue Through the Requested Work

When the developer asks for analysis, the analysis is the result. When the developer asks
for a fix or implementation, use Relic to clarify the work and then continue into code,
tests, and validation without requiring a second prompt.

For compliance work, connect each relevant requirement or decision to implementation and
test evidence. Distinguish missing evidence from a proven violation.

The roast is complete when no remaining question changes the current contract or blocks
the requested scope. Equivalent preferences, accepted risks, implementation details, and
future improvements do not keep it open. Handoff with the decisions that govern the
result, unresolved blockers if any, affected knowledge, and validation evidence.

## Preserve Knowledge Deliberately

Notice when the work creates or changes durable behavior, constraints, architecture,
responsibility boundaries, coordinated delivery scope, or reusable knowledge. At a
natural boundary:

1. Look for an existing canonical document that should be corrected or extended.
2. Prefer updating that document over creating duplicate knowledge.
3. Suggest a new specification, shared document, FR, NFR, ADR, or EPIC only when the
   knowledge has a useful independent identity.
4. Do not repeat a declined suggestion without new evidence.

Using Relic as context creates no documentation obligation. Investigations, discarded
hypotheses, local implementation details, and fixes that restore an existing contract do
not automatically need a record.

Persistence belongs to the developer:

- an explicit request to create, document, record, or update authorizes the named write;
- a confirmation authorizes writes only when the immediately preceding proposal named
  the exact documents to create or update;
- agreement with a decision alone does not authorize an unspecified documentation write;
- authorization to change code does not silently authorize new documentation.

When implementation changes the current knowledge frontier, identify affected documents
and propose the update. Write only after authorization. Active knowledge describes the
current project; remove obsolete alternatives unless the developer asks to preserve
them. Git retains history.

When persistence is authorized, read
[`references/knowledge-authoring.md`](references/knowledge-authoring.md). When authoring
or reviewing canonical specification HTML, also read
[`references/semantic-html.md`](references/semantic-html.md).

## Boundaries

- Do not own, create, or inject managed content into `AGENTS.md`.
- Do not impose project-governance filenames, roles, or taxonomies.
- Do not create hidden session state, counters, locks, reservations, tombstones, or a
  second Relic configuration file.
- Do not enforce status vocabulary, lifecycle transitions, fixed document sections, or
  superseded copies.
- Do not silently create, rename, move, renumber, reconcile, or delete knowledge.
- Do not orchestrate another prompt or require a Relic CLI command to reason.
