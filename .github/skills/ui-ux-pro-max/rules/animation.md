---
title: Animation
impact: MEDIUM
impactDescription: Wrong animation timing or animating expensive properties causes jank and motion sickness.
tags: [animation, transition, timing, transform, skeleton, loading]
---

# Animation

Rules for smooth, performant, accessible animations.

## duration-timing

Use **150–300ms** for micro-interactions (hover, toggle, expand). Use **300–500ms** for page transitions and larger animations.

| Interaction | Duration | Easing |
|------------|----------|--------|
| Hover/focus | 150–200ms | ease |
| Toggle/expand | 200–300ms | ease-in-out |
| Modal open | 200–300ms | ease-out |
| Page transition | 300–500ms | ease-in-out |

```css
/* Incorrect — too fast (jarring) or too slow (sluggish) */
.btn { transition: all 50ms; }
.modal { transition: all 800ms; }

/* Correct — appropriate timing */
.btn { transition: background-color 200ms ease; }
.modal { transition: opacity 250ms ease-out, transform 250ms ease-out; }
```

## transform-performance

Animate only `transform` and `opacity` — they run on the compositor thread. Never animate `width`, `height`, `top`, `left`, or `margin`.

```css
/* Incorrect — triggers layout recalculation */
.card:hover { width: 110%; margin-top: -10px; }

/* Correct — GPU-accelerated */
.card:hover { transform: scale(1.02) translateY(-4px); }
```

For elements that will animate, use `will-change` sparingly:

```css
.card { will-change: transform; }
```

## stable-hover

Hover states must not cause layout shift. Use `transform`, `box-shadow`, or `opacity` — never `scale` that affects siblings.

```css
/* Incorrect — shifts adjacent elements */
.card:hover { padding: 2rem; margin: -0.5rem; }

/* Correct — visually elevates without layout shift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

## loading-states

Show skeleton screens for content areas and spinners for actions.

```html
<!-- Skeleton screen — for content loading -->
<div class="animate-pulse space-y-3">
  <div class="h-6 bg-gray-200 rounded-md w-1/3"></div>
  <div class="h-4 bg-gray-200 rounded-md w-full"></div>
  <div class="h-4 bg-gray-200 rounded-md w-2/3"></div>
</div>

<!-- Spinner — for action feedback -->
<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" stroke="currentColor"
    stroke-width="4" fill="none" opacity="0.25" />
  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
</svg>
```
