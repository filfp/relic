# SkillExtractionContract

**Type:** contract
**Inferred from:** spec 010-prompt-snippet-injection (clarify session 2026-05-25); ownership transferred to spec 011-skill-extraction (clarify 2026-06-02)
**Confidence:** high

## Description

> **SUPERSEDED (2026-07-02).** Spec 011 was reframed from "skill extraction" to the
> first-party **Claude Code plugin with ambient SDD** — see
> [`ClaudePluginContract.md`](ClaudePluginContract.md) for the governing contract.
> Key deltas: skills ship inside the plugin (never written into project `.claude/`
> directories); per-project command copies are retired; the confirmation-gate model is
> replaced by the graduated autonomy ladder (read silent / maintain automatic /
> structural auto-with-announce, `sdd` config knob). The `<!-- use: relic.<skill> -->`
> directive system described below was never implemented and is dropped.
>
> This file is retained as a historical record of the earlier design.
