---
id: EPIC-003
---

# Skill roast discipline and reference routing

Relic hardens the central skill's confrontation behavior and makes reference loading an
explicit routing decision. The skill keeps investigating while a blocking fork is open,
suspends mutation of the affected boundary until the developer resolves it, names a
duplicated path as a material finding, and reads a focused reference only when that
reference's trigger fires.

The accepted behavior is owned by the
[skill-first knowledge workflow](../requirements/functional/FR-001-skill-first-knowledge-workflow.md).
This EPIC records the delivery scope and evidence for bringing the distributed skill up
to that contract.

## Why the contract needed the addition

The skill's persistence rules were explicit only for knowledge writes. Nothing in the
skill or in `FR-001` said what the agent may do to the project *while* a material
question is still open, so the expected restraint was unwritten intent rather than an
accepted rule. In long sessions the behavior degraded predictably: confirmation stopped,
and work continued past open questions.

## Delivery boundaries

- The suspension is triggered by an open blocking fork, never by an unfinished
  interrogation. An empty question frontier is not a precondition for starting work.
- Confrontation discipline stays a judgment contract in the skill. It does not become a
  mode, a lifecycle, a required preamble, a command, or persisted session state.
- The roast reference defines conduct, not presentation. It prescribes no question
  format, template, or vocabulary, and requires no engine-specific delegation.
- Reference routing stays lazy and trigger-based. The skill remains complete on its own
  for ordinary work.
- The existing guards against over-asking remain in force. Hardening must not trade
  premature action for ceremony on low-consequence work.

## Delivery scope

- Add `skills/relic/references/roast.md` covering frontier rounds, agent-owned fact
  finding, ledger restatement as the anti-drift mechanism, mutation suspension under a
  blocking fork, duplicated paths, and a clean stop condition.
- Extend `skills/relic/SKILL.md` with a single reference-routing section that owns every
  trigger, and with the mutation-suspension and duplicated-path rules.
- Remove the routing sentences previously scattered through the skill so routing has one
  authority.
- Amend `FR-001` with the suspension rule, the duplicated-path finding, and explicit
  trigger-based reference routing.
- Regenerate the embedded skill and refresh the self-hosted engine installations through
  the official installer.
- Extend the central-skill distribution test with the new contract and the new reference.

## Completion evidence

The source skill, the embedded copy, the installed engine copies, and `FR-001` agree on
the hardened behavior. Focused assertions in `packages/engines` cover reference routing,
mutation suspension, duplicated-path classification, and the roast reference's content.
Repository validation runs lint, typecheck, and the source test suites; distribution
gates run when the change reaches packaging.

See the [skill-first architecture](../decisions/ADR-001-skill-first-stateless-architecture.md),
the [product boundary](../../shared/SHARED-product.md), and the
[skill-first knowledge workflow](../requirements/functional/FR-001-skill-first-knowledge-workflow.md).
