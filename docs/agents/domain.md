# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — the index. Read it **first**; it tells you which context owns the area you're about to touch.
- **`docs/context/platform.md`** — **always read this**, in every context. It holds the shared foundation: tech stack, architecture principles, roles, the data model, and the **Glossary** (the shared domain language).
- **The relevant per-context file** for the area you're working in:
  - `docs/context/back-office.md` — `/owner`, `/admin`, `/staff`, `/teacher` (Assessment, classes & scheduling, question/exam bank, courses, rooms & booking, workflows, roadmap)
  - `docs/context/student-facing.md` — `/student`, `/parent` (taking exams, flashcards, self-paced courses, viewing class schedule, declaring availability)
- **`docs/adr/`** — read ADRs that touch the area you're about to work in (e.g. ADR-0001 — RoomSchedule denormalized).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

This is a **multi-context** repo. A `CONTEXT-MAP.md` at the root points to per-context `CONTEXT.md` files, with one shared **platform** context that every other context builds on:

```
/
├── CONTEXT-MAP.md            # index — read first
├── docs/
│   ├── context/
│   │   ├── platform.md       # shared: tech stack, architecture, roles, data model, glossary — always read
│   │   ├── back-office.md    # /owner /admin /staff /teacher
│   │   └── student-facing.md # /student /parent
│   └── adr/
│       ├── 0001-room-schedule-denormalized.md
│       └── 0002-...md
└── ...
```

Section numbers (§1–§8) are kept stable across the split, so cross-references like "xem §5" or "xem §2.3" still resolve — see `CONTEXT-MAP.md` for which file holds which section.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the **Glossary (§8) in `docs/context/platform.md`**. Don't drift to synonyms the glossary explicitly marks `_Avoid_`.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
