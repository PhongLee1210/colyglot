# Coding Standard

Coding conventions — how code is written, commented, and structured in colyglot.

## Coding Conventions

- Follow conventions present in `app/`, `components/`, and `lib/`.
- Business logic (scheduling, streak derivation, content transforms) belongs in `lib/` or `packages/*` — UI components compose it, they don't implement it.
- Data access happens exclusively through the Drizzle repositories in `lib/db/repositories/` (server-only). Server Components and server actions call repositories directly; client components go through a server action or route handler — never the data layer.
- Reuse UI primitives from `components/ui/` (Button, Card, Input, Dialog, Toast, EmptyState, Skeleton, ErrorInline).
- Favor explicit types; do not use `any`.
- Keep all functions and components focused and minimal; avoid duplication.
- Do not add dependencies without justification — the stack is deliberately lean (Bun, Next.js, Drizzle, Tailwind v4). Prefer platform APIs (Pointer Events, Web Speech, MediaRecorder) over libraries.
- Formatting is managed by Prettier (`.prettierrc`).
- Keep changes focused; do not combine unrelated refactoring.
- IF the same set of Tailwind utility classes is repeated across 3+ usages, extract it into a reusable component or a `cva`/`class-variance-authority` variant instead of copy-pasting the class string.

### Comments and Code Documentation

Write code that is self-explanatory through clear naming, small functions, and good module organization. Prefer improving the code over adding comments.

- Do **not** comment what the code does.
- Do **not** narrate obvious implementation steps.
- Do **not** leave commented-out code or `TODO`, `FIXME`, `HACK`, or placeholder comments unless explicitly requested.
- Do **not** use comments to compensate for poor naming, long functions, or weak architecture.

Comments should explain **why**, not **what**.

Only add comments when they provide context that cannot be inferred from the code itself, such as:

- Business rationale or design trade-offs.
- Performance optimizations or non-obvious implementation decisions.
- Framework, browser, or third-party library workarounds.
- References to research papers, RFCs, specifications, or external algorithms (e.g. the SM-2 scheduling math in `packages/srs`).

If a function needs extensive comments, refactor it into smaller, well-named functions first. Only comment inherently complex logic that remains after refactoring.

Before writing a comment, ask:

> "Would better naming, extraction, or structure make this comment unnecessary?"

If yes, improve the code instead. Comments are the last resort, not the first.

### Constants and Enum Definition Standards

- **Always define constants and status/priority enums using clear, context-neutral, and descriptive naming.**
- Use UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_EASE_FACTOR`, `RECORDING_MAX_MS`).
- Status and priority enums must be named to reflect their semantic meaning in a universal and unbiased way (e.g., `ReviewGrade`, not `GoodBadScore`; `SessionState`, not `HighLowEnum`).
- When implementing such constants or enums, prefer values that make code intention obvious (e.g., `FORGOT`, `HARD`, `GOOD`, `EASY`, `PERFECT`).
- Avoid domain-irrelevant, culturally-biased, or ambiguous terms.
- Maintain documentation or inline comments for all non-trivial constants/enums to clarify purpose, valid values, and expected usage.

**Example (from this repo's schema):**

```ts
export enum ReviewGrade {
  FORGOT = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
  PERFECT = 5,
}
export const DEFAULT_EASE_FACTOR = 2.5;
```

### Deterministic Time

Any scheduling or date-derived logic (SRS intervals, streaks, due queues) takes `now` as an explicit parameter — no hidden `Date.now()` inside pure functions. This keeps the engine unit-testable with fixed clocks and satisfies the cacheComponents non-determinism rules in the Rendering Standard.

## Logging and Error Handling (Server Side)

- When reporting errors on the server, use the following pattern:
  - What failed (with location: file & line)
  - Why it failed (technical reason)
  - How to fix (clear remediation)
  - Example:
    ```
    ERROR: Missing DATABASE_URL in apps/web/lib/db/index.ts:23
    WHY: The Postgres client cannot be created without a connection string
    FIX: Add DATABASE_URL to apps/web/.env.local (see .env.example for the Supabase format)
    ```

- Repository functions throw on invariant violations (e.g. `appendReviewLog` rejects grades outside 1–5 with a `RangeError`); route handlers and server actions catch and convert these into typed error responses the UI can render inline.
