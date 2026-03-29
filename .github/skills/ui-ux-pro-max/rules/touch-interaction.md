---
title: Touch & Interaction
impact: CRITICAL
impactDescription: Poor touch targets and missing feedback cause frustration; critical for mobile-first UIs.
tags: [touch, interaction, mobile, feedback, cursor, loading]
---

# Touch & Interaction

Rules for interactive elements across touch and pointer devices.

## touch-target-size

Minimum **44×44px** touch targets per WCAG 2.5.5. Apply to buttons, links, form controls, and cards.

```css
/* Incorrect — too small */
.icon-btn { width: 24px; height: 24px; }

/* Correct — meets minimum */
.icon-btn { min-width: 44px; min-height: 44px; }
```

## hover-vs-tap

Use `click`/`tap` for primary interactions. Hover reveals are supplementary—never gate functionality behind hover.

```tsx
/* Incorrect — content only visible on hover (unreachable on mobile) */
<div onMouseEnter={showMenu}>Options</div>

/* Correct — click activates, hover is enhancement */
<button onClick={toggleMenu}>Options</button>
```

## loading-buttons

Disable buttons during async operations and show a loading indicator to prevent double-submission.

```tsx
<button
  disabled={isSubmitting}
  className="flex items-center gap-2"
>
  {isSubmitting && <Spinner className="w-4 h-4 animate-spin" />}
  {isSubmitting ? "Saving..." : "Save"}
</button>
```

## error-feedback

Display clear error messages near the source of the problem, not only in toasts or console.

```tsx
/* Incorrect — generic toast far from field */
toast.error("Validation failed");

/* Correct — inline error below field */
<input aria-invalid={!!error} />
{error && <p className="text-sm text-red-600 mt-1">{error}</p>}
```

## cursor-pointer

Add `cursor-pointer` to all clickable elements: buttons, cards, links, toggles.

```css
/* Incorrect — default cursor on interactive card */
.card { /* no cursor rule */ }

/* Correct — indicates interactivity */
.card { cursor: pointer; }
```

## smooth-transitions

Use `transition` for state changes. **150–300ms** duration for micro-interactions.

```css
/* Incorrect — instant change */
.btn:hover { background: #3B82F6; }

/* Correct — smooth 200ms transition */
.btn {
  transition: background-color 200ms ease;
}
.btn:hover { background: #3B82F6; }
```
