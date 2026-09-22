# Coding Standard

Coding conventions — how code is written, commented, and structured.

## Coding Conventions

- Follow conventions present in `app/`, `components/`, `lib/`, and `config/`.
- Business logic (content loading/transformation/filtering) belongs in `lib/`. **UI components must not directly access filesystem/Markdown — always use `lib/blog` and `lib/api.ts`.**
- Reuse UI primitives from `components/ui/`.
- Favor explicit types; do not use `any`.
- Keep all functions and components focused and minimal; avoid duplication.
- Do not add unnecessary dependencies — this is a static site.
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
- References to research papers, RFCs, specifications, or external algorithms.

If a function needs extensive comments, refactor it into smaller, well-named functions first. Only comment inherently complex logic that remains after refactoring.

Before writing a comment, ask:

> "Would better naming, extraction, or structure make this comment unnecessary?"

If yes, improve the code instead. Comments are the last resort, not the first.

### Runtime Type Guards (`lib/guards.ts`)

Always use `lib/guards.ts` for runtime type checks.

### Constants and Enum Definition Standards

- **Always define constants and status/priority enums using clear, context-neutral, and descriptive naming.**
- Use UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_TIMEOUT_MS`).
- Status and priority enums must be named to reflect their semantic meaning in a universal and unbiased way (e.g., `TaskStatus`, not `GoodBadStatus`; `PriorityLevel`, not `HighLowEnum`).
- When implementing such constants or enums, prefer values that make code intention obvious (e.g., `PENDING`, `IN_PROGRESS`, `COMPLETED`; or `LOW`, `MEDIUM`, `HIGH`).
- Avoid domain-irrelevant, culturally-biased, or ambiguous terms.
- Maintain documentation or inline comments for all non-trivial constants/enums to clarify purpose, valid values, and expected usage.

**Example:**

```ts
// Correct:
export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}
export const DEFAULT_TASK_PAGE_SIZE = 10;

// Avoid (biased/unclear naming):
// enum GoodBadStatus { GOOD, BAD }
```

## Logging and Error Handling (Server Side)

- When reporting errors on the server, use the following pattern:
  - What failed (with location: file & line)
  - Why it failed (technical reason)
  - How to fix (clear remediation)
  - Example:
    ```
    ERROR: Found direct import of 'fs' in src/renderer/App.tsx:12
    WHY: Renderer process cannot access Node.js APIs for security reasons
    FIX: Move file operations to src/preload/file-ops.ts and call via window.api.readFile()
    ```
