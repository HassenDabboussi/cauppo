---
title: Accessibility
impact: CRITICAL
impactDescription: Inaccessible UIs exclude users and fail WCAG compliance; these are non-negotiable requirements.
tags: [accessibility, wcag, aria, contrast, keyboard, screen-reader]
---

# Accessibility

Core accessibility rules that every UI must satisfy before delivery.

## color-contrast

Maintain a minimum **4.5:1** contrast ratio for normal text and **3:1** for large text (18px+ bold or 24px+ regular).

```css
/* Incorrect — fails contrast */
.muted { color: #94A3B8; background: #F8FAFC; } /* ≈2.8:1 */

/* Correct — passes WCAG AA */
.muted { color: #475569; background: #F8FAFC; } /* ≈7.1:1 */
```

Use browser DevTools or https://webaim.org/resources/contrastchecker/ to verify.

## focus-states

Every interactive element must have a **visible focus ring** for keyboard navigation.

```css
/* Incorrect — removed focus indicator */
button:focus { outline: none; }

/* Correct — custom visible focus ring */
button:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

## alt-text

All meaningful images require descriptive `alt` text. Decorative images use `alt=""`.

```html
<!-- Incorrect — missing alt -->
<img src="chart.png" />

<!-- Correct — descriptive alt -->
<img src="chart.png" alt="Monthly revenue chart showing 23% growth in Q3" />

<!-- Correct — decorative image -->
<img src="divider.svg" alt="" role="presentation" />
```

## aria-labels

Icon-only buttons and non-text controls need `aria-label`.

```html
<!-- Incorrect — screen reader says "button" -->
<button><svg>...</svg></button>

<!-- Correct — screen reader says "Close dialog" -->
<button aria-label="Close dialog"><svg>...</svg></button>
```

## keyboard-nav

Tab order must follow visual reading order. Use semantic HTML to get correct order for free.

```html
<!-- Incorrect — breaks logical tab order -->
<div tabindex="5">First</div>
<div tabindex="1">Second</div>

<!-- Correct — natural DOM order -->
<div tabindex="0">First</div>
<div tabindex="0">Second</div>
```

## form-labels

Every form input must have a `<label>` with a matching `for`/`htmlFor` attribute, or use `aria-label`.

```html
<!-- Incorrect — placeholder is not a label -->
<input placeholder="Email" />

<!-- Correct — associated label -->
<label for="email">Email</label>
<input id="email" type="email" placeholder="you@example.com" />
```

## color-is-not-only-indicator

Never rely on color alone to convey meaning. Add icons, text, or patterns.

```html
<!-- Incorrect — only color shows error -->
<input style="border-color: red" />

<!-- Correct — icon + text + color -->
<input style="border-color: red" aria-invalid="true" />
<span class="text-red-600 flex items-center gap-1">
  <svg><!-- error icon --></svg> Email is required
</span>
```
