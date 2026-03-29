---
name: ui-ux-pro-max
description: "UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient. Integrations: shadcn/ui MCP for component search and examples."
license: MIT
metadata:
  author: ui-ux-community
  version: "2.0.0"
  date: February 2026
  abstract: Comprehensive UI/UX design guide for AI agents and developers. Contains 10 rule files across 8 categories covering accessibility, interaction, performance, layout, typography, animation, style selection, charts, workflow, and a pre-delivery checklist. Includes a searchable CLI database with 50+ styles, 97 color palettes, 57 font pairings, and 25 chart types across 9 technology stacks.
---

# UI/UX Pro Max — Design Intelligence

Comprehensive design guide for web and mobile applications. 10 rule files across 8 priority categories covering accessibility, interaction, performance, layout, typography, animation, style selection, charts, plus a design-system workflow and pre-delivery checklist. Includes a searchable CLI database with 50+ styles, 97 color palettes, 57 font pairings, and 25 chart types across 9 stacks.

## When to Apply

Reference these guidelines when:
- Designing new UI components or pages
- Choosing color palettes and typography
- Reviewing code for UX issues
- Building landing pages or dashboards
- Implementing accessibility requirements
- Delivering UI code for review

## Rule Categories by Priority

| Priority | Category | Impact | Rule File |
|----------|----------|--------|-----------|
| 1 | Accessibility | CRITICAL | `accessibility` |
| 2 | Touch & Interaction | CRITICAL | `touch-interaction` |
| 3 | Pre-Delivery Checklist | CRITICAL | `pre-delivery-checklist` |
| 4 | Performance | HIGH | `performance` |
| 5 | Layout & Responsive | HIGH | `layout-responsive` |
| 6 | Design System Workflow | HIGH | `design-system-workflow` |
| 7 | Typography & Color | MEDIUM | `typography-color` |
| 8 | Animation | MEDIUM | `animation` |
| 9 | Style Selection | MEDIUM | `style-selection` |
| 10 | Charts & Data | LOW | `charts-data` |

## Quick Reference

### 1. Accessibility (CRITICAL)

- `color-contrast` — Minimum 4.5:1 ratio for normal text, 3:1 for large text
- `focus-states` — Visible focus rings on all interactive elements
- `alt-text` — Descriptive alt text for meaningful images; `alt=""` for decorative
- `aria-labels` — aria-label for icon-only buttons and non-text controls
- `keyboard-nav` — Tab order matches visual reading order
- `form-labels` — Every input has an associated `<label>` with `for` attribute
- `color-is-not-only-indicator` — Add icons/text alongside color

### 2. Touch & Interaction (CRITICAL)

- `touch-target-size` — Minimum 44×44px touch targets
- `hover-vs-tap` — Use click/tap primary; hover as enhancement only
- `loading-buttons` — Disable + spinner during async operations
- `error-feedback` — Inline error messages near the field
- `cursor-pointer` — All clickable elements get `cursor: pointer`
- `smooth-transitions` — 150–300ms for state changes

### 3. Performance (HIGH)

- `image-optimization` — WebP/AVIF, srcset, lazy loading
- `reduced-motion` — Respect `prefers-reduced-motion`
- `content-jumping` — Reserve space (aspect-ratio, skeletons)

### 4. Layout & Responsive (HIGH)

- `viewport-meta` — `width=device-width, initial-scale=1`
- `readable-font-size` — Minimum 16px body text on mobile
- `horizontal-scroll` — No horizontal overflow at 375px
- `z-index-management` — Defined scale (10, 20, 30, 50, 70)
- `floating-navbar` — Proper spacing + content offset
- `consistent-container` — Same max-width across all sections

### 5. Typography & Color (MEDIUM)

- `line-height` — 1.5–1.75 for body text
- `line-length` — 65–75 characters per line
- `font-pairing` — Match heading/body font personalities
- `text-contrast-modes` — Correct colors for light and dark mode
- `glass-card-modes` — Different opacity per mode (≥0.8 light)

### 6. Animation (MEDIUM)

- `duration-timing` — 150–300ms micro-interactions, 300–500ms page transitions
- `transform-performance` — Only animate transform/opacity
- `stable-hover` — No layout shift on hover
- `loading-states` — Skeleton screens for content, spinners for actions

### 7. Style Selection (MEDIUM)

- `style-match` — Match style to product type and audience
- `consistency` — Same visual language on every page
- `no-emoji-icons` — SVG icons from Lucide/Heroicons/Phosphor
- `consistent-icon-sizing` — Fixed viewBox, consistent size classes
- `brand-logos` — Verify from Simple Icons or press kits

### 8. Charts & Data (LOW)

- `chart-type` — Match chart type to data relationship
- `color-guidance` — Accessible, distinguishable palettes (max 6–8 colors)
- `data-table` — Provide table alternative for accessibility
- `responsive-charts` — Use ResponsiveContainer wrappers

## How to Use

Read individual rule files for detailed examples and do/don't guidance:

```
rules/accessibility.md
rules/touch-interaction.md
rules/performance.md
rules/layout-responsive.md
rules/typography-color.md
rules/animation.md
rules/style-selection.md
rules/charts-data.md
rules/design-system-workflow.md
rules/pre-delivery-checklist.md
```

### CLI Design System Generator

Generate a complete design system using the searchable database:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <keywords>" --design-system [-p "Name"]
```

Available stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

See `rules/design-system-workflow.md` for the full step-by-step process.

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`

## References

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Tailwind CSS: https://tailwindcss.com/docs
- Heroicons: https://heroicons.com/
- Lucide Icons: https://lucide.dev/
- Simple Icons: https://simpleicons.org/
