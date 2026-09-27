# Coding Styles Patterns

Language-agnostic Clean Code principles for writing readable, maintainable code.

## Comments and Documentation

Write code that is self-explanatory through clear naming, small functions, and good module
organization. Prefer improving the code over adding comments.

- Do **not** comment what the code does.
- Do **not** narrate obvious implementation steps.
- Do **not** leave commented-out code or `TODO`, `FIXME`, `HACK`, or placeholder comments unless
  explicitly requested.
- Do **not** use comments to compensate for poor naming, long functions, or weak architecture.

Comments should explain **why**, not **what**. Only add one when it provides context that cannot
be inferred from the code itself, such as:

- Business rationale or design trade-offs.
- Non-obvious workarounds (runtime, platform, or third-party library quirks).
- References to specifications or external algorithms.

If a function needs extensive comments, refactor it into smaller, well-named functions first. Only
comment inherently complex logic that remains after refactoring.

Comments should clarify, not compensate for unclear code:

- Avoid comments that are misleading, incomplete, outdated, or technically true but practically
  confusing.
- Prefer self-explanatory code over comments that merely restate what the code does.
- Keep comments local and synchronized with the code they describe; never document behavior
  controlled elsewhere.
- If understanding the comment requires reading more code, fix the code or comment instead.

## Naming

### Reveal Intent

- Use intention-revealing names so the code explains what it means without comments.
- Never make readers guess what variables like `d`, `x`, or `r` represent — name them for what
  they hold (`elapsedDays`, `cursorX`, `retryCount`), not their type or position.
- Optimize names for readability, not typing speed — you write a name once, others read it
  thousands of times.
- Avoid mental mapping: don't force readers to translate cryptic names, abbreviations, or letters
  into meanings.
- Use explicit, meaningful names so the code communicates intent directly.
- Names should make logic and formulas understandable at a glance, without tracing definitions or
  call sites.
- Clarity over cleverness: reduce the reader's mental stack so they can focus on the actual logic.

### Be Accurate and Unambiguous

- Avoid disinformation: a name must accurately describe what the code actually is or does — don't
  call something a `list` if it isn't one, or name a function `getUser` if it also mutates state.
- No surprises: code should match the reader's expectations — a name's behavior should not hide
  side effects, unexpected scope, or unrelated logic the name doesn't imply.

### Be Distinct

- Make names distinct: avoid near-identical names (`data`, `data2`, `dataNew`) and visually
  confusing characters (`l` vs `1`, `O` vs `0`) that force readers to look twice.
- Use meaningful distinctions: different names should represent genuinely different behavior,
  purpose, or responsibility — don't rename something just to satisfy the compiler/linter.
- Avoid meaningless names like `data1`, `data2`, or generic `Manager`/`Handler` that describe no
  specific responsibility.
- Names should make the difference obvious without reading the implementation — if two things need
  a comment to tell them apart, rename one of them instead.

### Be Pronounceable and Searchable

- Use pronounceable names: if you can't naturally say a name out loud, rename it.
- Names should sound like normal human language, making them easy to remember and discuss.
- Pronounceable names improve code reviews, team communication, and onboarding.
- Code is read and discussed by humans, so names should be human-friendly, not cryptic
  (`generateTimestamp`, not `genTmstmp`).
- Use searchable names: meaningful names make code easy to locate and navigate.

### Match Length to Scope

- Name length should match scope: single letters are acceptable only for short-lived local
  variables in small methods (e.g. a loop index `i`), never for anything with wider scope.
- Avoid magic numbers/constants: replace raw values like `4`, `5`, or `7` with descriptive,
  searchable names (`MAX_RETRY_ATTEMPTS`, not `5`).
- Optimize for maintainability and navigation, not minimum character count.

### Don't Encode Types

- Avoid encodings: don't encode type or implementation details into names.
- Avoid Hungarian notation like `strName`, `iCount`, `objUser` when the type is already known by
  the language/IDE.
- Let types, compilers, and IDEs handle type information; let names communicate intent and
  meaning.
- Good naming answers "what does this represent?", not "what data type is this?"

### Constants, Enums, and Statuses

- Define constants and status/priority enums using clear, context-neutral, descriptive naming.
- Use the target language's conventional constant casing consistently within a codebase (e.g.
  `UPPER_SNAKE_CASE` in TypeScript/JS, exported `PascalCase` in Go) — match whatever that
  language's own ecosystem already does, not this doc.
- Status and priority unions/enums must be named to reflect their semantic meaning, not vague or
  ambiguous terms.
- Prefer values that make code intention obvious (`PENDING`, `IN_PROGRESS`, `COMPLETED`; or `LOW`,
  `MEDIUM`, `HIGH`).
