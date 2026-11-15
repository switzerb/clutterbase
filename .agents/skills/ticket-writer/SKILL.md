---
name: ticket-writer
description: Draft or refine Feature, Bug, Task, and Investigation tickets for human review and AI implementation. Use when asked to write a ticket, turn notes into an issue, or improve a ticket's scope and completion criteria.
metadata:
  version: '0.0.0'
---

# Ticket Writer

Write tickets for humans to review for accuracy and AI agents to implement.
Describe **what and why**, not how, unless implementation detail is necessary
to define the work or capture a user-specified constraint.

## Workflow

1. Establish the ticket type using the definitions below. Ask if ambiguous.
2. Ask targeted questions about missing information needed to define scope,
   expected behavior, or completion. Do not ask about fields with defaults
   unless there is a reason to question the default.
3. If the user cannot answer a question that blocks defining the work, propose
   an Investigation ticket rather than inventing a requirement.
4. Output the filled ticket directly in a Markdown code block. Do not submit
   it to an issue tracker unless asked.

Use short sentences and only information needed to understand and complete the
work. Do not invent facts, reproduction steps, root causes, or decisions.
Include only the sections required below or needed for this particular ticket.

## Shared fields

Every ticket starts with:

```markdown
# <Actionable title, 5–8 words>

**Status:** Not Started
**Type:** <Feature | Bug | Task | Investigation>
**Priority:** Medium
**Dependencies:** None

## Summary

<One paragraph: problem or goal, why it matters, and necessary context.>
```

Replace defaults with user-provided values. For dependencies, "None" means none
were mentioned, not that their absence was verified. Ask about priority when
the supplied information is conflicting or ambiguous; otherwise use Medium.

Add **Assumptions / Decisions / Constraints** when relevant. Record the user's
assumptions as assumptions, not established facts.

## Type-specific sections

### Feature

New application behavior. Add **Acceptance Criteria** with testable bullets
describing expected behavior and how to verify it. Cover relevant edge cases
and documentation needs without prescribing implementation.

### Bug

Demonstrably incorrect or problematic behavior. Add **Steps to Reproduce**,
**Expected Behavior**, and **Actual Behavior**, plus relevant environment or
evidence when supplied. Add **Acceptance Criteria** defining a verifiable fix.

### Task

A single, discrete action, such as installing a library. Add **Done When** with
observable completion conditions. Include only the context needed to execute it.

### Investigation

Research needed before implementation can be defined. Add **Questions to
Answer** and **Expected Output**. The output is documented findings, supporting
research and links, remaining assumptions, and decisions or recommendations
needed to define follow-up work. Do not present research as already completed
or require implementation as the outcome.

## Quality Guidelines

**Use domain language**: Mirror terminology from the codebase (e.g., if the code calls them "rules" not "checks", use "rules").
**Describe outcomes, not implementations**: Tickets should say _what_ must change, not _how_ to change it.
