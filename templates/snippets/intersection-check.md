Before declaring or changing `artifacts.json`, run the intersection check:

1. Identify the files this change will touch (`touches_files`) and the shared artifacts it will own or modify.
2. Scan every other spec's `artifacts.json` (`specs/*/artifacts.json`).
3. Flag any of these as a conflict:
   - A file in your `touches_files` appears in another spec's `touches_files` or `owns`.
   - A shared artifact you intend to own is already in another spec's `owns`.
4. Conflicts must be resolved before proceeding. Do **not** claim conflicting ownership. If the conflict cannot be resolved in this session, capture it under **Open Questions** in `spec.md` and stop.
