---
title: Performance
impact: HIGH
impactDescription: Unoptimized images, layout shifts, and missing motion preferences degrade user experience and Core Web Vitals.
tags: [performance, images, lazy-loading, reduced-motion, cls, webp]
---

# Performance

Rules for fast, smooth UI rendering and resource delivery.

## image-optimization

Use modern formats (WebP/AVIF), responsive `srcset`, and lazy loading for images below the fold.

```html
<!-- Incorrect — unoptimized PNG, no lazy loading -->
<img src="hero.png" />

<!-- Correct — responsive, lazy, modern format -->
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  decoding="async"
  alt="Hero banner"
/>
```

For above-the-fold hero images, use `loading="eager"` and `fetchpriority="high"`.

## reduced-motion

Respect `prefers-reduced-motion` for all animations and transitions.

```css
/* Base animation */
.fade-in {
  animation: fadeIn 300ms ease;
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }
}
```

In Tailwind:

```html
<div class="motion-safe:animate-fade-in motion-reduce:animate-none">
  Content
</div>
```

## content-jumping (CLS)

Reserve space for async content to prevent Cumulative Layout Shift.

```css
/* Incorrect — no reserved space */
.image-container { }

/* Correct — aspect ratio reserves space */
.image-container {
  aspect-ratio: 16 / 9;
  background: #F1F5F9;
}
```

For skeleton screens:

```html
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```
