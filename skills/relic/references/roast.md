# Roast Discipline

Read this reference when the developer requests a roast or a grill, or when the work has
an open blocking fork. Ordinary low-consequence work does not need it.

This reference governs how the confrontation is conducted. It does not prescribe a
question format, a document template, or a vocabulary; presentation stays project-owned.

## Contents

- Work the Open Frontier in Rounds — batching questions and recomputing after answers
- Find the Facts Yourself — what to investigate versus what to put to the developer
- Keep the Ledger Alive — restating open forks so a long session cannot drift past them
- Hold the Suspension Open — what a blocking fork stops, and what it never stops
- Name a Duplicated Path — recognizing a second mechanism in code and in knowledge
- Stop Cleanly — the frontier corollaries to the completion rule

## Work the Open Frontier in Rounds

Model the open decisions as a frontier: every decision whose prerequisites are already
settled. Those are the questions you can ask now without guessing at an answer you have
not heard yet.

- Ask the whole current frontier in one round instead of one question at a time.
- A question whose answer depends on another question still open belongs to a later
  round, not this one.
- Each answer reshapes the frontier. Recompute it and ask the next round.
- Recommend an answer for every question you ask.

Rounds order questions; they are not a lifecycle the developer must complete. A small or
well-constrained change often has an empty frontier on the first pass, and the roast ends
without a single question.

## Find the Facts Yourself

Finding facts is your job. Deciding is the developer's.

- Never ask for something the repository, the runtime, the tests, or the knowledge corpus
  can tell you. Read it, search it, or run it.
- Ask about intent, priority, ownership, acceptable risk, and the choice between options
  that evidence cannot separate.
- An unfinished investigation is an unsettled prerequisite. Ask the rest of the frontier
  now and keep the dependent question for the round after the evidence lands.
- Use the agent's ordinary native tools. Do not require a particular delegation, command,
  or engine capability to conduct a roast.

## Keep the Ledger Alive

`SKILL.md` keeps a temporary ledger in the conversation. Restating it is what makes it
survive: it returns the current constraints to recent context, where they still govern
behavior.

- Restate it at the start of each round and immediately before the first mutation that
  follows a round.
- Keep it short enough to repeat and specific enough to act on.
- Never write it to a file or turn it into session state, a counter, or a checklist.
- After a summary, handoff, or long gap, rebuild it from the conversation and from
  repository evidence. Do not treat a decision as confirmed because your own earlier text
  reads as if it were settled.

## Hold the Suspension Open

`SKILL.md` stops mutation of the affected boundary while a blocking fork is open. That is
the rule a long session loses first, so keep it concrete:

- Investigation is never suspended. Read, search, run tests, and inspect behavior freely.
- The suspension is scoped to the affected boundary, not to the conversation.
- Elapsed session length, work already invested, and your own growing confidence never
  lift it. Only the developer does.
- When the developer authorizes progress under an assumption, state that assumption in
  the same message as the work.

## Name a Duplicated Path

`SKILL.md` classifies a duplicated path as at least P1. Recognize it on both sides:

- In code: a new module, flag, branch, or helper that reimplements behavior the project
  already has. Recommend extending the current path.
- In knowledge: a second document describing the same current contract, a reused
  identity, or a fragment of a corpus that already has an owner. Recommend correcting the
  existing document.
- Do not resolve duplication by merging, moving, or deleting on your own authority. That
  is an authorized write like any other.

## Stop Cleanly

`SKILL.md` defines when the roast is complete. Two corollaries belong to the frontier: an
empty frontier is not a precondition for starting work, and a round holding no material
question is noise. Do not manufacture one to look rigorous.
