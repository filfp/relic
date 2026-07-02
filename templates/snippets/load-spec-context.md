Load the full spec context — read each of the following in full where it exists:

- `specs/<spec-id>/spec.md` — the original intent
- `specs/<spec-id>/plan.md` — architecture and implementation phases (skip if not yet created)
- `specs/<spec-id>/tasks.md` — the task breakdown (skip if not yet created)
- `specs/<spec-id>/artifacts.json` — owned and referenced shared artifacts
- Every file listed in `artifacts.json`'s `owns` and `reads` arrays

Substitute `<spec-id>` with the active spec ID from `relic context`. Do not infer paths from anywhere else.
