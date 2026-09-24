# Colyglot UI/UX Design Document

## Overview

Colyglot is a mobile-first Next.js web app for language learning: translate while reading, then remember via spaced-repetition flashcards.

The aesthetic — **Paper & Ink** — is calm and content-first: a warm paper canvas in light, ink-navy in dark, serif hanzi display type over a Vietnamese-native sans, and a subtle grain texture. Generous whitespace, restrained color, a near-neutral canvas so the card being studied stays in focus. Color carries state and hierarchy, not decoration. Every surface ships **light + dark** and **phone + desktop**; the phone is the primary form factor, not an afterthought.

Structure and UX conventions are adapted from LobeHub's design system (semantic tokens, mobile shell, UX checklists). Colors are Colyglot's own (primary blue) and live in `apps/web/app/globals.css`.

Rule of thumb: **static look & wording → this doc's system sections; dynamic behavior over time → [UX Rules](#ux-rules).**

### Design values

Four values, in conflict-priority order:

1. **Certainty** — the user always knows where they are, what happened, and what's next. No silent failures, no ambiguous states.
2. **Natural** — interactions match platform habits (thumb reach, back gesture, bottom sheets). Nothing to learn.
3. **Meaningful** — every element earns its place; color and motion carry meaning.
4. **Growth** — progress (streak, mastered cards) is visible, and advanced features reveal themselves progressively.

---

## Design System

### Colors

Tokens are CSS custom properties on `:root`, overridden under `[data-theme="dark"]`, and exposed to Tailwind via `@theme inline` (`bg-surface`, `text-fg-muted`, …). **Consume semantic tokens by name; never hard-code hex.** Raw scales (`primary-50…950`, `gray`, `green`, `red`, `orange`, `yellow`) exist for ramps (hover/active, tinted backgrounds) only.

**Text** — rank information with the text ramp, not with color:

| Token       | Light     | Dark      | Role                             |
| ----------- | --------- | --------- | -------------------------------- |
| `fg`        | `#1d1a15` | `#edf1f5` | primary text, icons              |
| `fg-muted`  | `#6e6a60` | `#a4b1bf` | secondary text, labels           |
| `fg-subtle` | `#9d988b` | `#71828f` | placeholders, captions, metadata |

Disabled = `opacity-50` on the control, not a fourth text color.

**Surfaces** — separate scale from text; never swap one for the other. Light is warm paper (`#faf9f6` canvas); dark is ink navy, and depth reads by getting _lighter_ as surfaces rise. A fixed SVG-noise grain (`body::after`, `--grain-opacity`) textures the canvas in both themes.

| Token         | Light     | Dark      | Role                                |
| ------------- | --------- | --------- | ----------------------------------- |
| `bg`          | `#faf9f6` | `#0e1319` | page canvas                         |
| `surface`     | `#ffffff` | `#151c24` | cards, sheets, dialogs, tab bar     |
| `surface-2`   | `#f3f1ea` | `#1c2530` | subtle separation, hover/press wash |
| `line`        | `#e8e4da` | `#27313d` | default divider / card edge         |
| `line-strong` | `#d8d3c5` | `#35424f` | stronger edge, active-press wash    |

**Functional** — reserved for meaning:

| Token                    | Light / Dark          | Role                                                            |
| ------------------------ | --------------------- | --------------------------------------------------------------- |
| `primary` / `on-primary` | `#0050ff` / `#28a5ff` | the single most important action, focus ring, links, active tab |
| `success`                | `#16a34a` / `#34d47c` | correct answer, "Good/Easy" grade, saved                        |
| `danger`                 | `#ff5e5e`             | wrong answer, "Again" grade, destructive, errors                |
| `warning`                | `#ea580c` / `#ff8a2b` | "Hard" grade, due-soon, quota warnings                          |
| `accent` / `on-accent`   | `#eab308` / `#eec52b` | highlights, streak flame, word highlight in reader              |

Tinted backgrounds use `color-mix(in srgb, var(--token) N%, transparent)` or the `-50/-100` step (light) / `-900/-950` step (dark) of the raw scale — never a new hex.

### Typography

| Family         | Token        | Use                                   |
| -------------- | ------------ | ------------------------------------- |
| Be Vietnam Pro | `font-sans`  | UI and prose (Latin + Vietnamese)     |
| Noto Serif SC  | `font-hanzi` | Chinese target text on cards / reader |
| Geist Mono     | `font-mono`  | counts, stats, tabular figures        |

Scale (Tailwind steps — don't introduce off-scale sizes):

| Step           | px    | Use                                                       |
| -------------- | ----- | --------------------------------------------------------- |
| `text-xs`      | 12    | captions, badges, dense metadata                          |
| `text-sm`      | 14    | default UI text, buttons, secondary lines                 |
| `text-[15px]`  | 15    | list-cell labels on mobile (the one sanctioned exception) |
| `text-base`    | 16    | body, **all text inputs** (prevents iOS zoom), headers    |
| `text-lg`/`xl` | 18/20 | section and page titles                                   |
| `text-2xl`+    | 24+   | card faces, completion stats                              |

Titles use `font-semibold` (600). Line height ~1.5 for body. Use `tabular-nums` whenever numbers update in place (counters, timers, progress).

### Spacing

4px base scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 (`1 · 2 · 3 · 4 · 5 · 6 · 8`). Rhythm: tight inside a group (8), more between groups (16), most between sections (24–32). Page side gutter on phone = **16px** (`px-4`). Cards pad 16–20. Off-scale values (6, 10, 13…) are drift — round to the nearest step. Icon sizes (16 / 20 / 22) and 1px borders are dimensions, not spacing.

### Shapes

| Radius         | px  | Use                                                  |
| -------------- | --- | ---------------------------------------------------- |
| `rounded-lg`   | 8   | chips, tags, small badges                            |
| `rounded-xl`   | 12  | buttons, inputs, icon buttons, rows in grouped lists |
| `rounded-2xl`  | 16  | cards, dialogs, bottom-sheet top corners             |
| `rounded-full` | —   | pills, avatars, progress bars                        |

One family per view; don't mix rounded and sharp corners.

### Elevation

Hierarchy comes from tonal surfaces and `line` borders first; shadows stay subtle and only on what genuinely floats.

- Cards / list groups: `border-line`, no shadow.
- Popovers, menus, floating tab bar: soft shadow (`0 8px 16px -4px rgb(0 0 0 / .2)`).
- Dialogs / bottom sheets: strongest tier (`0 20px 20px -8px rgb(0 0 0 / .24)`) + `backdrop:bg-black/50`.
- Study flashcard: may carry a stack shadow — it is the hero object.

Prefer a border over a shadow when both would read.

### Motion

Motion clarifies change; never decoration. `prefers-reduced-motion` already collapses all animation globally in `globals.css`.

- State changes, popovers, toasts: 100–200ms (`toast-in`, `deck-stack-in`).
- Sheets, dialogs, route-level overlays: ≤ 300ms, ease-out.
- Card flip (`rotate-y-180`) and swipe-off (`fly-off-left/right/up`) are the signature motions of Study — keep them physical and under ~350ms.
- `stagger-in` for list first-render only, never on refetch. `pop-in` for celebration moments (completion check, streak). `progress-sheen` animates the study progress bar.
- Loading: skeletons (`components/ui/skeleton`) shaped like the settled layout — no generic spinners for page content.

---

## Mobile-First Layout

The core pattern borrowed from LobeHub: an **app shell with two page types** — root pages with a bottom tab bar, and pushed detail pages with a back-button header. Desktop reuses the same pages in a wider frame; it does not get a separate design.

### Layout constants

| Constant           | Value               | Notes                                                          |
| ------------------ | ------------------- | -------------------------------------------------------------- |
| Content max width  | 480px               | centered column (`max-w-[480px] mx-auto`) on phone and desktop |
| Nav header height  | 44px                | back / title / actions                                         |
| Tab bar height     | 48px                | + `env(safe-area-inset-bottom)`                                |
| Header icon button | 36px box, 22px icon | minimum tap area for chrome                                    |
| Primary tap target | ≥ 44px tall         | main CTAs, grade buttons, list cells                           |
| Side gutter        | 16px                | `px-4`                                                         |

Define these once (e.g. `apps/web/lib/constants/layout.ts`) and import; don't re-type the numbers.

### Page types

**1. Root page (tab page)** — `/`, `/tags`, `/me`

```
┌───────────────────────────┐ ← safe-area-top
│ Header: logo/title · acts │  44px, sticky, NOT inside scroll
├───────────────────────────┤
│                           │
│  single scroll container  │  overflow-y-auto, padding-bottom = tab bar
│                           │
├───────────────────────────┤
│  ◉ Decks   ○ Tags   ○ Me  │  48px fixed tab bar
└───────────────────────────┘ ← safe-area-bottom
```

- Tab bar shows **only on root routes** — keep an explicit allow-list (`MOBILE_TAB_ROUTES = new Set(['/', '/tags', '/me'])`), hide everywhere else.
- Tab item = icon + short label. Active: icon filled with `color-mix(primary 33%)` + `text-primary` label; inactive: `text-fg-subtle`. 2–4 tabs max.
- Switching tabs replaces, doesn't stack, history.

**2. Detail page (pushed)** — `/decks/[id]`, `/me/settings`, `/me/subscription`, …

```
┌───────────────────────────┐
│ ‹  Deck title        ⋯    │  back · centered/leading title · right actions
├───────────────────────────┤
│  single scroll container  │
├───────────────────────────┤
│ [ Primary action ]        │  optional pinned footer, outside scroll
└───────────────────────────┘
```

- Back button always present, goes to the logical parent (not `history.back()` when entered via deep link).
- Identity (title, breadcrumb) reads separately from actions (overflow `⋯`, share, save status) — left/center vs right.
- Actions or status for scrollable content are **pinned** in a header/footer, never inside the scroll area.

**3. Focus page** — Study session, onboarding

- No tab bar, no app chrome. Header = close (✕, confirms if progress would be lost) + progress bar + counter.
- Primary controls (Show answer, grade row) pinned to the **bottom thumb zone**.

### Shell rules

- **One scroll container per page.** Header and footer sit outside it (`flex flex-col h-dvh`, scroll area `flex-1 min-h-0 overflow-y-auto`). Don't let `body` scroll under a fixed bar.
- Use `dvh` (not `vh`) for full-height layouts so the mobile browser toolbar and keyboard don't clip content.
- Respect safe areas: `pt-[max(env(safe-area-inset-top),12px)]`, `pb-[max(env(safe-area-inset-bottom),…)]` on the outermost fixed elements only.
- Wider screens (≥ 768px): keep the 480px column; optionally move tabs to a left rail. Center content and let side margins grow. Never stretch cards edge-to-edge on desktop.

### Mobile components

**List cell** (settings, Me page, deck actions) — the workhorse row:

- `px-4 py-4`, `gap-3`, leading icon 20px `text-primary`, label `text-[15px]`, trailing chevron 16px `text-line-strong`.
- Press feedback: `active:bg-surface-2` (touch has no hover — every tappable row needs an `:active` wash).
- Group cells in a `rounded-2xl border-line bg-surface` block with hairline dividers; section title above in `text-xs text-fg-subtle uppercase`.
- Build one `Cell` component and compose it; don't hand-roll rows per page.

**Bottom sheet** — the default overlay on phone:

- Use for forms (create deck, add card, rename), pickers, and row action menus. Slides up from bottom, `rounded-t-2xl`, drag handle, max ~95% `dvh`, content scrolls inside, submit button pinned at sheet bottom.
- Centered `Dialog` is reserved for short confirmations (delete, discard) and for ≥ 768px.
- On desktop the same content renders as a centered dialog — one component, responsive presentation.

**Action menus** — long-press or `⋯` opens a sheet of cells (not a tiny dropdown) on phone. Destructive item last, `text-danger`, separated by a divider.

**Inputs** — `text-base` (16px) minimum, `min-h-11`, correct `inputMode` / `enterKeyHint` / `autoComplete`. Composer-style inputs (card back, bulk import) can expand to full-screen while typing.

**Toasts** — bottom-center, above the tab bar / pinned footer, never covering the primary action.

---

## Components

Prefer `apps/web/components/ui/*` over bespoke markup; add to it rather than re-deriving chrome per page.

| Component            | Status   | Notes                                                                                                        |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `Button`             | exists   | variants `primary · secondary · ghost · danger · success · warning`; sizes `sm 36 · md 40 · lg 48 · icon 36` |
| `Card`               | exists   | `surface` + `line` border                                                                                    |
| `Dialog`             | exists   | native `<dialog>`; confirmations + desktop overlays                                                          |
| `Input`              | exists   | 16px text on mobile                                                                                          |
| `Skeleton`           | exists   | shape to the settled layout                                                                                  |
| `EmptyState`         | exists   | icon + one line + CTA                                                                                        |
| `ErrorInline`        | exists   | message + Retry                                                                                              |
| `Toast`              | exists   |                                                                                                              |
| `AppShell`           | exists   | evolve into `RootShell` (tab bar) + `DetailShell` (back header)                                              |
| `TabBar`             | to build | fixed bottom, allow-listed routes                                                                            |
| `NavHeader`          | to build | back · title · right actions, 44px                                                                           |
| `Cell` / `CellGroup` | to build | list rows (see above)                                                                                        |
| `Sheet`              | to build | bottom sheet; falls back to `Dialog` ≥ 768px                                                                 |

Button hierarchy: **exactly one primary per surface**, and it must be the visually dominant control. Default/secondary for ordinary actions, ghost for low emphasis, danger for destructive. Every interactive element shows a visible `:focus-visible` ring (`outline-primary`).

Icons: `lucide-react`, 16 (inline) / 20 (cells, buttons) / 22 (header).

---

## Screens & Flows

| Screen            | Route                  | Page type | Notes                                                                          |
| ----------------- | ---------------------- | --------- | ------------------------------------------------------------------------------ |
| Dashboard (Decks) | `/`                    | Root      | streak, due count, deck list, create deck (sheet)                              |
| Tags              | `/tags`                | Root      | tag management across decks                                                    |
| Me                | `/me`                  | Root      | profile banner + cell groups → Settings, Subscription, Export, About, Feedback |
| Deck Detail       | `/decks/[id]`          | Detail    | card list, add/edit (sheet), bulk import; pinned **Study now** CTA             |
| Study             | `/decks/[id]/study`    | Focus     | SRS session                                                                    |
| Completion        | `/decks/[id]/complete` | Focus     | session stats + streak + "Back to decks"                                       |
| Deck Export       | `/decks/[id]/export`   | Detail    | Anki / CSV                                                                     |
| Settings          | `/me/settings`         | Detail    | study preferences, study steps, locale, theme                                  |
| Subscription      | `/me/subscription`     | Detail    | pricing tiers, checkout                                                        |
| Auth              | `/sign-in`             | Focus     | sign in, auto sign-in, sign-out confirmation (deferred epic)                   |
| Onboarding        | `/onboarding`          | Focus     | language pair → how-to guide                                                   |
| Not Found         | —                      | Detail    | back to Decks                                                                  |

**Primary flow:**

```
Sign in
  → Onboarding (first visit)
  → Dashboard (deck list)
  → Select deck → Study session
  → Grade cards → Completion (streak/progress) → Dashboard
```

---

## Study System (SRS)

### Card Exercise Types

| Type                   | Description                                         |
| ---------------------- | --------------------------------------------------- |
| **Flip card**          | Show front → user recalls → reveal back             |
| **Multiple choice**    | Show term → pick correct translation from 4 options |
| **Sentence fill (AB)** | Fill in the blank                                   |
| **Reverse**            | Target language → source language                   |

### Study screen (mobile)

```
┌───────────────────────────┐
│ ✕   ▓▓▓▓▓▓░░░░░   12/30   │  close · progress · counter (tabular-nums)
├───────────────────────────┤
│                           │
│        ┌─────────┐        │
│        │  你好    │        │  card = hero, centered, font-hanzi
│        │   🔊     │        │
│        └─────────┘        │
│                           │
├───────────────────────────┤
│ [       Show answer     ] │  pinned, thumb zone, ≥ 48px
│ Again  Hard  Good  Easy   │  after reveal: grade row replaces it
└───────────────────────────┘
```

- Tap card = flip. Swipe left/right/up may map to grades (`fly-off-*`) but every gesture has a visible button equivalent.
- Grade buttons carry label + next-interval hint (`Good · 3d`); color is paired with text, never color alone (danger → warning → primary → success).
- Close mid-session: progress is saved per card, so no destructive confirm — say so in copy ("Progress saved").
- Audio (`speak-button`) and recording controls sit on/under the card, not in the header.

### Grading

Cards graded after each review; the SRS engine (`@colyglot/srs`, SM-2) schedules the next review date.

### Session Completion

Shown after all due cards are reviewed: session stats (reviewed, accuracy, time), streak update (`pop-in` on the flame), primary **Back to decks**, secondary **Study more** when more cards are available.

---

## UX Rules

Behavioral checklist (adapted from LobeHub's `ux` skill). Walk it for every surface.

**Read — data & lists**

- [ ] Design all four states: empty, loading, error, success. Empty is a real screen with a CTA (no decks → Create deck; no due cards → "All caught up" + next due time).
- [ ] Check **error before empty** — a failed fetch never renders as "no decks".
- [ ] Every loading state can fail: timeout/error shows Retry, never an infinite skeleton.
- [ ] Lists work from 1 → 10k rows (paginate / virtualize card lists); search/filter runs over the full set server-side.
- [ ] Always-rendered chrome (header, tab bar) still gets a body empty state.

**Edit — entering content**

- [ ] Never lose input: drafts in card/deck forms survive reload (localStorage backup) and failed saves; closing a dirty sheet asks to discard.
- [ ] Placeholders are static examples, not instructions that vanish.

**Act — operations & buttons**

- [ ] Exactly one primary action per surface, visually dominant.
- [ ] Actions lead forward: after creating a deck, land in it with "Add card" primary.
- [ ] A result that changes the next step lands in a persistent state (inline/screen), not only a toast.
- [ ] Async action: confirm → in-progress (locked, `Saving…`) → done/error with Retry; reset busy flags in `finally`.
- [ ] Optimistic updates surface failure (toast + rollback), never silently revert.
- [ ] Destructive: confirm dialog naming the object (`Delete "HSK 1"?`); wide-blast (delete all cards, delete account) needs type-to-confirm.
- [ ] Entities have their full lifecycle: create, rename, delete, (export) — not display-only.
- [ ] List and detail stay in sync after an edit.

**Grow — discoverability**

- [ ] Advanced options (study steps, bulk import) are one level deep, not on the first screen.
- [ ] Subscription gates show inline upsell at the point of need (settings, completion) → Subscription screen; never a dead disabled button without explanation.

**Streak** — shown on the Dashboard header as a quiet motivational indicator (`accent` flame + count), not a nagging banner.

---

## Voice & Content

Precise, calm, no filler. Friendly on the surface, reliable underneath.

- Canonical terms, never synonyms: **Deck, Card, Tag, Study, Review, Due, Streak, Grade**. Don't drift between "flashcard / card / note".
- Name actions verb + noun: `Create deck`, `Add card`, `Delete tag` — never bare `OK` / `Submit` / `Confirm`.
- In-progress: present participle + ellipsis (`Saving…`, `Importing 120 cards…`).
- Confirm outcomes by naming what changed (`"HSK 1" renamed`); skip "successfully".
- Every error says what to do next (`Couldn't load decks. Retry`).
- Warmth budget: ~80% information / 20% warmth; up to 70/30 at key moments (first run, empty, all caught up, streak lost). Max one sentence of warmth, always followed by the next step. No guilt-tripping on missed streaks.

---

## Do's and Don'ts

- **Do** read semantic tokens (`bg-surface`, `text-fg-muted`, `text-primary`). **Don't** hard-code hex.
- **Do** rank text with `fg → fg-muted → fg-subtle`. **Don't** signal state with color alone — pair with icon or label.
- **Do** keep `primary` for the single most important action, focus, and active tab. **Don't** spread it as decoration.
- **Do** design phone first, then verify at ≥ 768px; verify light and dark.
- **Do** keep one scroll container per page with header/footer outside it. **Don't** put pinned actions inside the scroll area.
- **Do** use bottom sheets for forms and menus on phone. **Don't** use tiny dropdowns or hover-only affordances.
- **Do** give every tappable element an `:active` state and ≥ 44px hit area. **Don't** rely on `:hover` for touch.
- **Do** use 16px text in inputs. **Don't** let iOS zoom the viewport on focus.
- **Do** hold WCAG AA contrast (4.5:1 body) and show `:focus-visible` rings.
- **Don't** mix rounded and sharp corners, or introduce off-scale spacing / font sizes.
