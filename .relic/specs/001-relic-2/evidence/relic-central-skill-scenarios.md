# Relic Central Skill Scenario Tests

> Date: 2026-07-30
> Scope: Stage 4 behavioral contract
> Source under test: `skills/relic/`

These scenarios test the instruction contract of the central Relic skill. They are not
new workflows or prompt templates. Each starts from an ordinary developer request and
checks whether one invocation can use repository knowledge, reduce material uncertainty,
continue through the requested scope, and respect developer-owned persistence.

## Scenario 1 — Idea discovery without automatic persistence

**Developer request:** “Use Relic to roast an idea for rotating authentication tokens.”

**Relevant evidence:** `relic.yaml`, the authentication specification selected from its
topology, shared authentication contract, and current token code.

**Expected behavior:** The agent bounds the idea, challenges authority and failure
behavior in proportion to risk, derives any solution forced by current contracts, and
asks only about remaining material product forks. It may suggest a durable record at the
end, but creates nothing unless the developer authorizes a named write.

**Contract assertion:** One request performs discovery. No mode selector, second prompt,
or automatic document is required.

## Scenario 2 — Explicit specification isolation

**Developer request:** “Isolate the confirmed token-rotation behavior as a new
specification, then implement it.”

**Relevant evidence:** Current topology, canonical specification identities, shared
authentication knowledge, and the accepted discussion.

**Expected behavior:** The request explicitly authorizes one specification. The agent
reads the spec root, chooses the value after the greatest current valid identity, checks
the ID and destination case-insensitively, writes a canonical semantic `index.html` with
ordinary relative links, and continues into implementation and validation.

**Contract assertion:** The specification is developer-requested, numbering uses current
corpus evidence without a counter, and implementation does not require another Relic
command or prompt.

## Scenario 3 — Explicit typed-record extraction

**Developer request:** “Record the confirmed 200 ms authentication latency budget as an
NFR.”

**Relevant evidence:** Current topology, existing NFR identities, and the confirmed
latency constraint.

**Expected behavior:** The agent proposes the next current `NFR-NNN` identity, verifies
the destination, writes the record with only required `id` metadata plus project-chosen
fields, and adds relevant ordinary links. It does not manufacture a status lifecycle,
template sections, a lock, or a superseded copy.

**Contract assertion:** The only persisted artifact is the NFR named by the developer.

## Scenario 4 — Implementation compliance

**Developer request:** “Use Relic to check whether token storage complies with the
authentication knowledge.”

**Relevant evidence:** The shared contract, linked ADR and FR, implementation, and tests.

**Expected behavior:** The agent maps each relevant requirement or decision to concrete
code and test evidence, separating a missing test from a proven behavior violation. It
reports findings, severity, consequences, and recommendations. It does not change code
or documentation because the request authorizes review only.

**Contract assertion:** Compliance is an internal lens of the same skill, not a separate
mode or command.

## Scenario 5 — Derivable decision followed by implementation

**Developer request:** “Implement token revocation according to the current Relic
knowledge.”

**Relevant evidence:** A shared rule requires digest-only token storage and the current
adapter has one extension point consistent with that rule.

**Expected behavior:** When the evidence leaves one coherent implementation, the agent
states the derived decision and continues through code and tests. It does not ask the
developer to choose the already-determined storage form. If implementation changes a
documented contract, it names the affected documents and requests persistence
authorization.

**Contract assertion:** A derivable solution is not converted into ceremony, and code
authorization does not silently become documentation authorization.

## Scenario 6 — Fix with intentionally no new document

**Developer request:** “Use Relic as context and fix the token comparison bug. Do not
create documentation.”

**Relevant evidence:** Existing authentication contract, current comparison code, failing
test, and runtime reproduction.

**Expected behavior:** The agent uses Relic to establish intended behavior, fixes the
code, adds or updates the test, validates the change, and creates no Relic document
because the fix restores an existing contract and the developer explicitly declined
persistence.

**Contract assertion:** Relic can complete a fix while acting only as shared context and
reasoning guidance.

## Cross-session continuation

Scenario 2 leaves all approved continuity in repository knowledge: topology, the
canonical specification, its relative links, code, and tests. A later session can start
from project instructions and `relic.yaml`; none of the six scenarios requires a
hidden session, decision cache, or conversation transcript.

## Gate verdict

The scenarios cover idea discovery, specification isolation, record extraction,
implementation compliance, implementation after derivable decisions, and a fix with no
new document. Persistence occurs only in scenarios 2 and 3, where the developer names
the requested artifacts. Every scenario remains one ordinary request to the same skill.
