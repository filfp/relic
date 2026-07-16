---
description: "Query the Relic knowledge layer (read-only — answers only, no mutations)"
allowed-tools: "Bash(relic *)"
---

<!-- GENERATED from templates/prompts/ask.md by scripts/build-plugin.ts — do not edit. -->

# /relic:ask

Use `/relic:ask` to query the shared Relic knowledge layer before committing to a workflow
command. Ask anything: "which spec owns the auth domain?", "what assumptions exist about
our payment provider?", "has anyone defined a contract for the order event?"

---

> **Include directives:** when you see `<!-- include: relic snippet <name> -->`, run `relic snippet <name>` and inline the output in place. Snippets may nest — repeat until none remain, then act on the fully expanded prompt.

<!-- include: relic snippet preamble-guard -->
<!-- include: relic snippet read-only-guard -->

## Step 1 — Search the knowledge base

<!-- include: relic snippet search-knowledge -->

`relic search` covers all three index spaces simultaneously: shared artifacts (domains, contracts, rules, assumptions), specs, and fix documents. The example keyword extraction for this command: "what contracts exist for authentication?" → `auth session token contract login`.

---

## Step 2 — Answer

Compose a direct answer to the user's question, grounded in what you read.

For each claim, cite the source: `**[ArtifactName]** (.relic/<path>)`.

If the knowledge base does not contain enough information to answer, say so explicitly:

> "The shared knowledge base does not have a recorded answer for this. You may want to check
> the source code directly, or consider capturing this as a shared artifact after you
> investigate."

---

## What NOT to do

- Do NOT run `relic write` — not for registering, not for any reason
- Do NOT run `relic scaffold`
- Do NOT create, edit, or delete any file
- Do NOT suggest the user run `/relic:specify`, `/relic:clarify`, `/relic:plan`, or any other
  workflow command — answer the question and stop
- Do NOT invent information not present in the knowledge base — cite or admit uncertainty
