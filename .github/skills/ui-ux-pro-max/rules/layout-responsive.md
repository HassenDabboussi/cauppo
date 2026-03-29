---
title: Layout & Responsive
impact: HIGH
impactDescription: Broken layouts on mobile or content hidden behind fixed elements are immediate usability blockers.
tags: [layout, responsive, viewport, z-index, navbar, mobile-first]
---

# Layout & Responsive

Rules for responsive layouts that work across all viewport sizes.

## viewport-meta

Always include the viewport meta tag.

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

## readable-font-size

Minimum **16px** body text on mobile. Smaller sizes cause zoom and readability issues.

```css
/* Incorrect — too small on mobile */
body { font-size: 12px; }

/* Correct — readable base */
body { font-size: 16px; }

/* With responsive scaling */
body {
  font-size: 16px;
}
@media (min-width: 768px) {
  body { font-size: 18px; }
}
```

## horizontal-scroll

Ensure no horizontal overflow on mobile. Test at **375px** width.

```css
/* Incorrect — causes horizontal scroll */
.hero { width: 1200px; }

/* Correct — constrained to viewport */
.hero {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}
```

## z-index-management

Define a z-index scale to prevent stacking chaos.

```css
:root {
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-toast: 70;
}

.navbar  { z-index: var(--z-fixed); }
.modal   { z-index: var(--z-modal); }
.toast   { z-index: var(--z-toast); }
```

## floating-navbar

Floating navbars need spacing from edges, and page content must account for navbar height.

```css
/* Incorrect — content hidden behind fixed navbar */
.navbar { position: fixed; top: 0; left: 0; right: 0; }
.main   { /* no offset */ }

/* Correct — floating with proper content offset */
.navbar {
  position: fixed;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  border-radius: 0.75rem;
}
.main {
  padding-top: 5rem; /* navbar height + gap */
}
```

## consistent-container

Use a single max-width strategy across all sections.

```html
<!-- Incorrect — inconsistent widths -->
<section class="max-w-4xl">...</section>
<section class="max-w-7xl">...</section>
<section class="max-w-5xl">...</section>

<!-- Correct — consistent container -->
<section class="max-w-6xl mx-auto px-4">...</section>
<section class="max-w-6xl mx-auto px-4">...</section>
```

## responsive-breakpoints

Test at these four breakpoints minimum:

| Breakpoint | Width | Device |
|-----------|-------|--------|
| `sm` | 375px | iPhone SE |
| `md` | 768px | iPad |
| `lg` | 1024px | Laptop |
| `xl` | 1440px | Desktop |
