---
title: Pre-Delivery Checklist
impact: CRITICAL
impactDescription: Final quality gate before delivering UI code; prevents shipping broken or unprofessional interfaces.
tags: [checklist, quality, review, delivery, testing]
---

# Pre-Delivery Checklist

Verify every item before delivering UI code. Items are grouped by category.

## Visual Quality

- [ ] No emojis used as icons (use SVG from Lucide/Heroicons)
- [ ] All icons from a single consistent icon set
- [ ] Brand logos verified from official sources (Simple Icons / press kit)
- [ ] Hover states do not cause layout shift
- [ ] Theme colors used directly (`bg-primary`) not `var()` wrappers in Tailwind

## Interaction

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback (color, shadow, or opacity)
- [ ] Transitions are smooth (150–300ms)
- [ ] Focus states visible for keyboard navigation (`focus-visible`)
- [ ] Buttons disabled + spinner during async operations

## Light / Dark Mode

- [ ] Light mode body text ≥ 4.5:1 contrast ratio
- [ ] Glass/transparent elements visible in light mode (≥ 0.8 opacity)
- [ ] Borders visible in both modes
- [ ] Tested both modes end-to-end before delivery

## Layout

- [ ] Floating/fixed elements have proper spacing from viewport edges
- [ ] No content hidden behind fixed navbars or headers
- [ ] Tested at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scrollbar on mobile

## Accessibility

- [ ] All images have descriptive `alt` text (or `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` elements
- [ ] Color is not the only information indicator (add icons/text)
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Interactive elements reachable and operable via keyboard

## Performance

- [ ] Images use modern formats (WebP/AVIF) with `loading="lazy"`
- [ ] Above-the-fold images use `loading="eager"` + `fetchpriority="high"`
- [ ] Skeleton screens for async content (no layout shift)
- [ ] Fonts loaded with `font-display: swap`
