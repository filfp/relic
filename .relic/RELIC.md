---
topology:
  specs: .relic/specs
  shared: .relic/shared
  records:
    fr: .relic/records/requirements/functional
    nfr: .relic/records/requirements/non-functional
    adr: .relic/records/decisions
    epic: .relic/records/epics
---

# Relic Project Knowledge

This is the sole topology authority and the first Relic context when project instructions
do not already route an agent here. Relic preserves the current knowledge frontier used
by developers and coding agents; Git preserves superseded history.

## Entry points

- [Relic 2.0 product specification](specs/001-relic-2/index.html)
- [Product boundary](shared/SHARED-product.md)
- [Knowledge model](shared/SHARED-knowledge-model.md)
- [Implementation and validation map](shared/SHARED-development.md)
- [Relic 2.0 release epic](records/epics/EPIC-001-relic-2-release.md)

## Working contract

- Use the central Relic skill to challenge, clarify, implement, review, or fix work
  without imposing a specify → clarify → plan → tasks pipeline.
- Code is evidence of present behavior. Relic documents capture current intent,
  requirements, decisions, and boundaries. Investigate drift instead of assigning
  universal precedence to either source.
- Consulting Relic creates no documentation obligation. Persist only knowledge the
  developer explicitly requests or confirms through a proposal naming the exact writes.
- Prefer correcting an existing node over creating duplicate knowledge. Remove obsolete
  active knowledge unless the developer asks to retain it.
- Ordinary repository-relative links form the knowledge web. Broken links and ambiguous
  identities are maintenance evidence, not workflow blockers.

## Authoring

Follow the current topology. For a numbered spec, FR, NFR, ADR, or EPIC, inspect current
canonical identities of that kind and propose one greater than the greatest valid
current value. Check the identity and destination case-insensitively immediately before
writing. There is no counter, lock, reservation, tombstone, generator, or second
configuration file.
