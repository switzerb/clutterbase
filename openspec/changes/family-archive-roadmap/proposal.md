# Proposal: Family Archive Roadmap

## Why

Clutterbase will help family members preserve, discover, and interpret letters, photographs, and scanned memorabilia, with people and their stories at the center. This planning-only proposal preserves the exploratory decisions and roadmap so that work can proceed in small changes and fresh sessions without losing the larger direction.

## What Changes

- Capture product principles, conceptual boundaries, release direction, and deferred decisions.
- Organize future work into broad milestones, not single-pass implementation commitments.
- Specify only the next small change in detail when ready; do not predesign every milestone.
- No application behavior, schema, API, or implementation tasks are introduced by this document.

### Agreed Product Direction

- Start with one private archive. Material is immediately visible to everyone with archive access; initial review is not a publication gate.
- Multiple private archives may exist later. Their memberships and interpretation of material are independent. Cross-archive exchange, including metadata transfer, is explicitly deferred.
- Upload should be effortless. Each uploaded file creates one item. A ten-page letter can be one ten-page PDF; page splitting, combining, and grouping are out of scope initially.
- Items have thumbnails and can be browsed, described, tagged, searched, and connected to people. Requiring titles at upload was discouraged; the exact fallback display behavior remains to be specified.
- Cataloging is gradual. Unknown information is valid. Dates must support years and ranges, including uncertain descriptions such as “Bob says this happened in the 1980s.” The exact date representation is not decided.
- Reusable archive tags and existing-tag suggestions should encourage consistency. People and dates should not be reduced to free-form tags. Exact structured fields and tag-management rules remain open.
- Historical person records and contributor accounts are distinct, even when they represent the same human.
- Person profiles start simply: a photo, biographical text, associated material, family relationships, and attributed contributions. People should be able to contribute their own biographies; ownership and editing rules remain open.
- Contributors can attach text and recollections to items. Individual voices can coexist rather than overwrite a single authoritative account. Recollections are distinct from shared catalog descriptions.
- Person–item connections carry meaning, such as depicts, authored by, addressed to, and mentions. Family relationships and item relationships also matter. Store a relationship once and interpret its reverse rather than maintaining contradictory duplicate edges; symmetric relationships need not be forced into directional wording.
- Start item–item connections with “related to” and an optional explanation. More specific relationship types can follow demonstrated needs. A graph-shaped domain does not require a graph database or graph visualization.
- Initial review can be completed and reopened. Items remain editable and open to enrichment indefinitely. Keep a small history of who completed or reopened review, when, and optionally why; do not build a complete edit audit trail.
- Human initial review, AI processing, and individual AI suggestion review are independent concepts.

### AI Direction

AI is part of the intended family release, but follows the archive foundation. Transcribing letters is the first major AI feature; suggesting existing archive tags is a subsequent opportunity.

- Processing happens in the background without blocking visibility or browsing.
- AI-generated content retains its origin after acceptance.
- Suggestions have an unreviewed, accepted, or dismissed disposition. Accepting one does not complete an item's initial review.
- Unreviewed AI transcription is searchable, with clear AI/unreviewed labeling wherever its status matters, including matching search excerpts.
- Imperfect text is acceptable as a discovery aid, not an authoritative historical account.
- Proposed default, not yet a detailed requirement: unaccepted tags, people, and date suggestions do not silently become established catalog metadata.
- Provider, queue technology, retry behavior, supported inputs, and transcription editing/version behavior remain undecided.

### Roadmap and Progress

All milestones below are upcoming. No product capability is complete by virtue of this roadmap. Existing code is a Vue scaffold with local Supabase setup, not an implemented archive.

| Milestone                      | Outcome and broad scope                                                                                                      | Boundary                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Upload and browse           | Establish archive access, file storage, bulk uploads, thumbnails, item listing/detail, and image/PDF viewing.                | No cataloging workflow, people graph, or AI. This milestone should be subdivided before implementation. |
| 2. Describe and review         | Add descriptions, approximate dates/ranges, reusable tags/autocomplete, initial-review inbox, reopening, and review history. | No exhaustive metadata ontology or complete edit audit.                                                 |
| 3. People and connections      | Add simple person profiles, family relationships, meaningful item–person links, and person-centered browsing.                | No full genealogy editor or global person identity system.                                              |
| 4. Contributions and discovery | Add attributed recollections on items and people, related-item links, and metadata search/filtering.                         | No graph visualization or cross-archive sharing.                                                        |
| 5. AI transcription            | Add background transcription, provenance, suggestion disposition, and search over labeled unreviewed text.                   | No requirement to automate historical truth or identification.                                          |
| 6. AI tag suggestions          | Recommend existing archive tags for contributor acceptance or dismissal.                                                     | Optional for the first family release; avoid uncontrolled AI vocabulary creation.                       |

Milestones 1–5 are the current proposed family-release target, not a commitment to ship every feature before reassessing. Sequence and boundaries may change with learning; useful browsing/search may need to arrive earlier than milestone 4.

### Working in Small Changes

- Keep this document as the roadmap and decision summary, not an implementation backlog.
- Use separate OpenSpec changes for small, testable end-to-end slices. A milestone can span several changes.
- Explore the next slice against the actual code and existing specs before proposing it. The user specifically raised that even upload may be too large for one pass.
- Candidate subdivisions for milestone 1—not confirmed scope—are a minimal private upload/view path, bulk-upload interaction and failures, and thumbnail/PDF browsing improvements. Determine safe archive access before any real private material is exposed; do not defer privacy as cosmetic polish.
- Let schema migrations introduce later concepts when needed. Preserve known boundaries without creating speculative tables or generic frameworks upfront.
- At each boundary, record delivered behavior in capability specs through the normal change workflow. Update roadmap progress and consequential cross-slice decisions only with authorization.
- This roadmap is not an implementation-ready change. Do not apply it or expand it into one large set of design/spec/task artifacts automatically.

### Deferred Decisions

- Cross-archive exchange, copying, metadata transfer, and synchronization.
- Global person records, cross-archive identity matching, and merging.
- Advanced genealogy, relationship vocabularies, and visual graph tools.
- Page splitting/combining, alternate digital representations, and historical-original identity.
- Complete audit trails, per-item permissions, and moderation/publication gates.
- Exact membership roles, invitation/authentication flow, supported file limits, and upload failure behavior.
- Date uncertainty controls, biography editing rights, detailed search semantics, and AI infrastructure.

### Fresh-Session Handoff

Read this proposal, then inspect current OpenSpec capability specs, active changes, and relevant source. Distinguish delivered behavior from roadmap intentions. Explore the smallest useful next slice, preserve confirmed decisions, and ask about unresolved choices rather than treating proposed defaults as settled. Use `/opsx-propose` to create a focused implementation change; use `/opsx-apply` only once that change has implementation tasks. Exploration itself does not implement.

## Capabilities

### New Capabilities

None in this planning-only capture. The roadmap describes future capabilities, not new behavioral contracts. Future implementation changes will choose cohesive capability boundaries and create their own specs.

### Modified Capabilities

None. The capability inventory is currently empty. Only this proposal was requested; no specs, design, tasks, or workflow metadata edits are authorized by this capture. Normal completion/validation of a docs-only change may require a separately authorized `skip_specs` metadata declaration; this proposal is intentionally not presented as a completed or apply-ready change.

## Impact

Documentation only: `openspec/changes/family-archive-roadmap/proposal.md`, plus CLI-generated change scaffold metadata. No runtime code, database schema, dependencies, access configuration, or deployed services change.
