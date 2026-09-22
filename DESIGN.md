# Colyglot UI/UX Design Document

## Overview

Colyglot is a Next.js web app for language learning. Design language: primary blue color system, CSS variable–based theming, spaced-repetition flashcard study flow.

Scaffold stage — no screens built yet. This doc defines the target design system and UX so implementation stays consistent as features land.

---

## Design System

### Colors

Define as 10-step scales (50–950) in Tailwind theme / global CSS.

| Scale                | Usage                                                 |
| -------------------- | ----------------------------------------------------- |
| **Primary Blue**     | Brand, CTAs, links (`#0050ff` light / `#28a5ff` dark) |
| **Gray**             | Backgrounds, borders, muted text                      |
| **Green**            | Success states, correct answers                       |
| **Red**              | Danger, errors, wrong answers                         |
| **Orange**           | Warnings                                              |
| **Secondary Yellow** | Highlights, accents                                   |

### Theming

CSS custom properties at `:root`, toggled light/dark (e.g. via `next-themes`). Switching theme = swapping the variable set.

| Token         | Light                | Dark              |
| ------------- | -------------------- | ----------------- |
| `--primary`   | `#0050ff`            | `#28a5ff`         |
| `--body-bg`   | `rgb(255, 255, 255)` | `rgb(37, 37, 37)` |
| `--body-text` | `#6a6a6a`            | `#bababa`         |
| `--danger`    | `#ff5e5e`            | `#ff5e5e`         |

### Typography

- Font stack: system/Roboto-style sans
- Icons: Material Symbols (or equivalent icon set)

---

## Screens & Flows (Web App)

- **Auth** — Sign in, auto sign-in, sign-out confirmation
- **Onboarding** — language pair selection → how-to guide
- **Dashboard** — deck list with study stats and streak
- **Study** — SRS flashcard session (see Study System below)
- **Deck Edit** — card CRUD, bulk import
- **Deck Export** — export to Anki/CSV
- **Settings** — study preferences, study step configuration, locale
- **Subscription** — pricing tiers, checkout
- **Tags** — tag management across decks
- **Static pages** — About, Feedback, Not Found

**Primary flow:**

```
Sign in
  → Onboarding (first visit)
  → Dashboard (deck list)
  → Select deck → Study session
  → Grade cards → View streak/progress
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

### Grading

Cards graded 1–5 after each review; SRS algorithm schedules next review date. UI: star/button row.

### Session Completion

Completion screen shown after all due cards reviewed, displaying session stats and encouraging streak continuation.

---

## Shared UX Patterns

### Empty States

Every list view (no decks, no cards, no study due) has a dedicated empty-state screen with a call to action.

### Loading

Consistent animated loaders while API calls are in flight.

### Error Handling

Inline error messages / toast notifications for failed API calls, auth errors, and validation.

### Streak

Study streak displayed on dashboard home screen as a motivational indicator.

### Subscription Gates

Premium features gated behind a subscription check. Upsell surfaces appear inline (e.g., settings, study completion) and route to Subscription screen.
