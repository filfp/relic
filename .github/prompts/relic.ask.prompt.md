---
description: Relic ask command
---

# /relic.ask

> **Before proceeding:** Read `.relic/preamble.md`. It defines where artifacts belong.
> Violating those rules cannot be undone by a changelog entry.

> **This command is strictly read-only.** It MUST NOT create, modify, or delete any file.
> It MUST NOT call `relic write`, `relic scaffold`, or any other mutating command.
> It MUST NOT suggest or trigger follow-on workflow steps.
> Output is the answer only — nothing else.

Use `/relic.ask` to query the shared Relic knowledge layer before committing to a workflow
command. Ask anything: "which spec owns the auth domain?", "what assumptions exist about
our payment provider?", "has anyone defined a contract for the order event?"

---

## Step 1 — Extract keywords

Read the user's question. Extract up to 10 keywords: domain terms, entity names, verbs,
technical concepts. Prefer specific nouns over generic ones.

Example: "what contracts exist for authentication?" → `auth session token contract login`

---

## Step 2 — Search the knowledge base

```bash
relic search <keyword1> <keyword2> ...
```

This searches across all three index spaces simultaneously:
- **Shared artifacts** — domains, contracts, rules, assumptions
- **Specs** — feature spec summaries
- **Fix documents** — diagnosed bugs and their resolutions

Read the toon output. Each result line is:
`<source> | <name> | <path> | <tags> | <tldr> | <score>`

---

## Step 3 — Read top results

For each result with `score ≥ 1`, read the full file at `<path>` (relative to `.relic/`).

Prioritise: higher score first. If two scores are equal, prefer `knowledge` source over `spec`,
and `spec` over `fix`.

Read as many files as needed to answer the question confidently. Stop when you have enough.

---

## Step 4 — Fallback if search is insufficient

If the targeted search returned no results, or the results do not cover the question:

```bash
relic search --deep
```

This returns every entry across all categories. Filter by the `tldr` field to identify
candidates — read only the files where the `tldr` is clearly relevant. Do not read all files
indiscriminately.

---

## Step 5 — Answer

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
- Do NOT suggest the user run `/relic.specify`, `/relic.clarify`, `/relic.plan`, or any other
  workflow command — answer the question and stop
- Do NOT invent information not present in the knowledge base — cite or admit uncertainty
