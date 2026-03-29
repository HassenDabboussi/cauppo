# UI/UX Pro Max — Full Compiled Guide

Comprehensive UI/UX design reference for AI agents and developers. 10 rule files across 8 priority categories. Includes a searchable CLI database with 50+ styles, 97 color palettes, 57 font pairings, and 25 chart types across 9 technology stacks.

---

## Table of Contents

1. [When to Apply](#when-to-apply)
2. [Rule Categories by Priority](#rule-categories-by-priority)
3. [Accessibility (CRITICAL)](#accessibility-critical)
4. [Touch & Interaction (CRITICAL)](#touch--interaction-critical)
5. [Pre-Delivery Checklist (CRITICAL)](#pre-delivery-checklist-critical)
6. [Performance (HIGH)](#performance-high)
7. [Layout & Responsive (HIGH)](#layout--responsive-high)
8. [Design System Workflow (HIGH)](#design-system-workflow-high)
9. [Typography & Color (MEDIUM)](#typography--color-medium)
10. [Animation (MEDIUM)](#animation-medium)
11. [Style Selection (MEDIUM)](#style-selection-medium)
12. [Charts & Data (LOW)](#charts--data-low)

---

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

---

## Accessibility (CRITICAL)

Core accessibility rules that every UI must satisfy before delivery.

### color-contrast

Maintain a minimum **4.5:1** contrast ratio for normal text and **3:1** for large text (18px+ bold or 24px+ regular).

```css
/* Incorrect — fails contrast */
.muted { color: #94A3B8; background: #F8FAFC; } /* ≈2.8:1 */

/* Correct — passes WCAG AA */
.muted { color: #475569; background: #F8FAFC; } /* ≈7.1:1 */
```

Use browser DevTools or https://webaim.org/resources/contrastchecker/ to verify.

### focus-states

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

### alt-text

All meaningful images require descriptive `alt` text. Decorative images use `alt=""`.

```html
<!-- Incorrect — missing alt -->
<img src="chart.png" />

<!-- Correct — descriptive alt -->
<img src="chart.png" alt="Monthly revenue chart showing 23% growth in Q3" />

<!-- Correct — decorative image -->
<img src="divider.svg" alt="" role="presentation" />
```

### aria-labels

Icon-only buttons and non-text controls need `aria-label`.

```html
<!-- Incorrect — screen reader says "button" -->
<button><svg>...</svg></button>

<!-- Correct — screen reader says "Close dialog" -->
<button aria-label="Close dialog"><svg>...</svg></button>
```

### keyboard-nav

Tab order must follow visual reading order. Use semantic HTML to get correct order for free.

```html
<!-- Incorrect — breaks logical tab order -->
<div tabindex="5">First</div>
<div tabindex="1">Second</div>

<!-- Correct — natural DOM order -->
<div tabindex="0">First</div>
<div tabindex="0">Second</div>
```

### form-labels

Every form input must have a `<label>` with a matching `for`/`htmlFor` attribute, or use `aria-label`.

```html
<!-- Incorrect — placeholder is not a label -->
<input placeholder="Email" />

<!-- Correct — associated label -->
<label for="email">Email</label>
<input id="email" type="email" placeholder="you@example.com" />
```

### color-is-not-only-indicator

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

---

## Touch & Interaction (CRITICAL)

Rules for interactive elements across touch and pointer devices.

### touch-target-size

Minimum **44×44px** touch targets per WCAG 2.5.5.

```css
/* Incorrect */
.icon-btn { width: 24px; height: 24px; }

/* Correct */
.icon-btn { min-width: 44px; min-height: 44px; }
```

### hover-vs-tap

Use `click`/`tap` for primary interactions. Hover reveals are supplementary — never gate functionality behind hover.

```tsx
/* Incorrect — content only visible on hover */
<div onMouseEnter={showMenu}>Options</div>

/* Correct — click activates, hover is enhancement */
<button onClick={toggleMenu}>Options</button>
```

### loading-buttons

Disable buttons during async operations and show a loading indicator.

```tsx
<button disabled={isSubmitting} className="flex items-center gap-2">
  {isSubmitting && <Spinner className="w-4 h-4 animate-spin" />}
  {isSubmitting ? "Saving..." : "Save"}
</button>
```

### error-feedback

Display clear error messages near the source of the problem, not only in toasts.

```tsx
/* Incorrect */
toast.error("Validation failed");

/* Correct — inline below field */
<input aria-invalid={!!error} />
{error && <p className="text-sm text-red-600 mt-1">{error}</p>}
```

### cursor-pointer

Add `cursor-pointer` to all clickable elements.

```css
/* Incorrect */
.card { /* no cursor rule */ }

/* Correct */
.card { cursor: pointer; }
```

### smooth-transitions

Use `transition` for state changes. **150–300ms** duration.

```css
/* Incorrect — instant */
.btn:hover { background: #3B82F6; }

/* Correct */
.btn {
  transition: background-color 200ms ease;
}
.btn:hover { background: #3B82F6; }
```

---

## Pre-Delivery Checklist (CRITICAL)

Verify every item before delivering UI code.

### Visual Quality

- [ ] No emojis used as icons (use SVG from Lucide/Heroicons)
- [ ] All icons from a single consistent icon set
- [ ] Brand logos verified from official sources (Simple Icons / press kit)
- [ ] Hover states do not cause layout shift
- [ ] Theme colors used directly (`bg-primary`) not `var()` wrappers in Tailwind

### Interaction

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback (color, shadow, or opacity)
- [ ] Transitions are smooth (150–300ms)
- [ ] Focus states visible for keyboard navigation (`focus-visible`)
- [ ] Buttons disabled + spinner during async operations

### Light / Dark Mode

- [ ] Light mode body text ≥ 4.5:1 contrast ratio
- [ ] Glass/transparent elements visible in light mode (≥ 0.8 opacity)
- [ ] Borders visible in both modes
- [ ] Tested both modes end-to-end before delivery

### Layout

- [ ] Floating/fixed elements have proper spacing from viewport edges
- [ ] No content hidden behind fixed navbars or headers
- [ ] Tested at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scrollbar on mobile

### Accessibility

- [ ] All images have descriptive `alt` text (or `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` elements
- [ ] Color is not the only information indicator (add icons/text)
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Interactive elements reachable and operable via keyboard

### Performance

- [ ] Images use modern formats (WebP/AVIF) with `loading="lazy"`
- [ ] Above-the-fold images use `loading="eager"` + `fetchpriority="high"`
- [ ] Skeleton screens for async content (no layout shift)
- [ ] Fonts loaded with `font-display: swap`

---

## Performance (HIGH)

### image-optimization

Use modern formats (WebP/AVIF), responsive `srcset`, and lazy loading for images below the fold.

```html
<!-- Incorrect -->
<img src="hero.png" />

<!-- Correct -->
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

### reduced-motion

Respect `prefers-reduced-motion` for all animations.

```css
.fade-in { animation: fadeIn 300ms ease; }

@media (prefers-reduced-motion: reduce) {
  .fade-in { animation: none; }
}
```

In Tailwind:

```html
<div class="motion-safe:animate-fade-in motion-reduce:animate-none">Content</div>
```

### content-jumping (CLS)

Reserve space for async content to prevent Cumulative Layout Shift.

```css
/* Incorrect */
.image-container { }

/* Correct */
.image-container {
  aspect-ratio: 16 / 9;
  background: #F1F5F9;
}
```

Skeleton screens:

```html
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

---

## Layout & Responsive (HIGH)

### viewport-meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### readable-font-size

Minimum **16px** body text on mobile.

```css
body { font-size: 16px; }
@media (min-width: 768px) { body { font-size: 18px; } }
```

### horizontal-scroll

No horizontal overflow on mobile. Test at **375px**.

```css
/* Incorrect */
.hero { width: 1200px; }

/* Correct */
.hero { width: 100%; max-width: 100vw; overflow-x: hidden; }
```

### z-index-management

Define a z-index scale:

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
```

### floating-navbar

Floating navbars need spacing from edges, and page content must account for navbar height.

```css
/* Incorrect */
.navbar { position: fixed; top: 0; left: 0; right: 0; }

/* Correct */
.navbar { position: fixed; top: 1rem; left: 1rem; right: 1rem; border-radius: 0.75rem; }
.main { padding-top: 5rem; }
```

### consistent-container

Use a single max-width strategy across all sections.

```html
<!-- Correct — consistent -->
<section class="max-w-6xl mx-auto px-4">...</section>
<section class="max-w-6xl mx-auto px-4">...</section>
```

### responsive-breakpoints

| Breakpoint | Width | Device |
|-----------|-------|--------|
| `sm` | 375px | iPhone SE |
| `md` | 768px | iPad |
| `lg` | 1024px | Laptop |
| `xl` | 1440px | Desktop |

---

## Design System Workflow (HIGH)

### Step 1: Analyze Requirements

Extract from the user request:
- **Product type** — SaaS, e-commerce, portfolio, dashboard, landing page
- **Style keywords** — minimal, playful, professional, elegant, dark mode
- **Industry** — healthcare, fintech, gaming, education, beauty
- **Stack** — React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Generate Design System (REQUIRED)

Always start with `--design-system`:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This searches 5 domains in parallel (product, style, color, landing, typography) and returns a complete design system.

### Persist for Multi-Page Projects

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

Creates:
- `design-system/MASTER.md` — Global source of truth
- `design-system/pages/` — Folder for page-specific overrides

### Page-Specific Overrides

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

Retrieval hierarchy:
1. Check `design-system/pages/<page-name>.md` first
2. If exists → its rules override the Master
3. If not → use `design-system/MASTER.md` exclusively

### Step 3: Supplement with Domain Searches

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| More style options | `style` | `"glassmorphism dark"` |
| Chart recommendations | `chart` | `"real-time dashboard"` |
| UX best practices | `ux` | `"animation accessibility"` |
| Alternative fonts | `typography` | `"elegant luxury"` |
| Landing structure | `landing` | `"hero social-proof"` |

### Available Domains

`product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `prompt`

### Step 4: Stack Guidelines

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

### Output Formats

```bash
# ASCII box (terminal)
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown (documentation)
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

### Example Workflow

**Request:** "Build a landing page for a professional skincare service"

1. Analyze: Beauty/Spa, elegant/professional, Wellness, html-tailwind
2. Generate: `python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service elegant" --design-system -p "Serenity Spa"`
3. Supplement: `python3 skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux`
4. Stack: `python3 skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind`
5. Implement using the synthesized design system

### Tips for Better Results

1. **Be specific** — `"healthcare SaaS dashboard"` > `"app"`
2. **Search multiple times** — Different keywords reveal different insights
3. **Combine domains** — Style + Typography + Color = complete system
4. **Always check UX** — Search `"animation"`, `"z-index"`, `"accessibility"`
5. **Use stack flag** — Get implementation-specific best practices
6. **Iterate** — Try different keywords if first results don't match

---

## Typography & Color (MEDIUM)

### line-height

Use **1.5–1.75** line-height for body text. Headings can use **1.1–1.3**.

```css
p { line-height: 1.6; }
h1 { line-height: 1.2; }
```

### line-length

Limit body text to **65–75 characters** per line.

```css
.content { max-width: 65ch; }
```

### font-pairing

Match heading/body font personalities.

| Heading | Body | Mood |
|---------|------|------|
| Inter | Inter | Clean, modern, neutral |
| Playfair Display | Lato | Elegant, editorial |
| Montserrat | Open Sans | Professional, approachable |
| Space Grotesk | DM Sans | Tech, modern |
| Fraunces | Work Sans | Premium, warm |

```css
:root {
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
h1, h2, h3 { font-family: var(--font-heading); }
body { font-family: var(--font-body); }
```

### text-contrast-modes

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Heading | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) |
| Body | `#334155` (slate-700) | `#CBD5E1` (slate-300) |
| Muted | `#475569` (slate-600) | `#94A3B8` (slate-400) |
| Border | `#E2E8F0` (gray-200) | `#334155` (slate-700) |

### glass-card-modes

Glass/transparent cards need different opacities per mode.

```css
.glass-light { background: rgba(255, 255, 255, 0.8); }
.glass-dark  { background: rgba(15, 23, 42, 0.6); }
```

### color-usage

Use theme tokens instead of raw hex values.

```css
/* Incorrect */ .btn { background: #3B82F6; }
/* Correct */  .btn { background: var(--color-primary); }
```

---

## Animation (MEDIUM)

### duration-timing

| Interaction | Duration | Easing |
|------------|----------|--------|
| Hover/focus | 150–200ms | ease |
| Toggle/expand | 200–300ms | ease-in-out |
| Modal open | 200–300ms | ease-out |
| Page transition | 300–500ms | ease-in-out |

```css
.btn { transition: background-color 200ms ease; }
.modal { transition: opacity 250ms ease-out, transform 250ms ease-out; }
```

### transform-performance

Animate only `transform` and `opacity` — they run on the compositor thread.

```css
/* Incorrect — triggers layout */
.card:hover { width: 110%; margin-top: -10px; }

/* Correct — GPU-accelerated */
.card:hover { transform: scale(1.02) translateY(-4px); }
```

### stable-hover

Hover states must not cause layout shift.

```css
/* Incorrect */
.card:hover { padding: 2rem; margin: -0.5rem; }

/* Correct */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

### loading-states

Skeleton screens for content areas, spinners for actions.

```html
<!-- Skeleton -->
<div class="animate-pulse space-y-3">
  <div class="h-6 bg-gray-200 rounded-md w-1/3"></div>
  <div class="h-4 bg-gray-200 rounded-md w-full"></div>
  <div class="h-4 bg-gray-200 rounded-md w-2/3"></div>
</div>

<!-- Spinner -->
<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" stroke="currentColor"
    stroke-width="4" fill="none" opacity="0.25" />
  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
</svg>
```

---

## Style Selection (MEDIUM)

### style-match

Match the UI style to the product type and audience.

| Product | Recommended Styles |
|---------|-------------------|
| SaaS Dashboard | Minimalism, Flat Design, Neumorphism |
| E-commerce | Clean, Card-based, Responsive-first |
| Portfolio | Brutalism, Editorial, Glassmorphism |
| Healthcare | Soft Minimalism, Accessible-first |
| Fintech | Dark Mode, Data-dense, Flat |
| Beauty/Spa | Glassmorphism, Soft gradients, Elegant |
| Gaming | Cyberpunk, Neon, Dark, Animated |

Use the CLI for tailored recommendations:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product> <industry>" --design-system
```

### consistency

Use the **same style** across all pages and components.

```
✗ Homepage: glassmorphism → Dashboard: flat → Settings: material
✓ Homepage: glassmorphism → Dashboard: glassmorphism → Settings: glassmorphism
```

### no-emoji-icons

**Never** use emojis as UI icons. Use SVG icon libraries.

```html
<!-- Incorrect -->
<span>🎨</span> Design

<!-- Correct -->
<Palette className="w-5 h-5" /> Design
```

Recommended icon sets:
- **Lucide** — Clean, consistent, MIT license
- **Heroicons** — Tailwind-native, by Tailwind Labs
- **Simple Icons** — Brand/logo SVGs
- **Phosphor** — Flexible weights

### consistent-icon-sizing

Use a fixed `viewBox` (24×24) and consistent sizing classes.

```html
<!-- sm: w-4 h-4 | md: w-5 h-5 | lg: w-6 h-6 -->
<Icon className="w-5 h-5" />
```

### brand-logos

Always verify brand logos from official sources.

```html
<img src="https://cdn.simpleicons.org/github" alt="GitHub" class="h-6" />
```

---

## Charts & Data (LOW)

### chart-type

Match chart type to the data relationship.

| Data Relationship | Chart Type | Library |
|------------------|------------|---------|
| Trend over time | Line, Area | Recharts, Chart.js |
| Comparison | Bar, Grouped Bar | Recharts, Nivo |
| Part-of-whole | Pie, Donut, Treemap | Recharts, D3 |
| Distribution | Histogram, Box Plot | D3, Plotly |
| Correlation | Scatter, Bubble | D3, Plotly |
| Flow/Process | Sankey, Funnel | D3, Nivo |
| Geographic | Choropleth, Dot map | Mapbox, Leaflet |
| Hierarchical | Sunburst, Tree | D3, Nivo |
| Real-time | Sparkline, Gauge | Recharts |

### color-guidance

Use accessible, distinguishable palettes. Maximum **6–8 distinct colors** per chart.

```typescript
const chartColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];
```

Rules:
- Sequential data → single-hue gradient (light → dark)
- Categorical → distinct-hue palette
- Diverging → two-hue gradient with neutral midpoint
- Never rely on color alone — add labels, patterns, or tooltips

### data-table

Always provide a table alternative for chart data.

```tsx
<BarChart data={data} aria-hidden="true" />

<table className="sr-only">
  <caption>Monthly Revenue</caption>
  <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
  <tbody>
    {data.map(d => (
      <tr key={d.month}><td>{d.month}</td><td>${d.revenue.toLocaleString()}</td></tr>
    ))}
  </tbody>
</table>
```

### responsive-charts

Use `ResponsiveContainer` or similar wrappers.

```tsx
/* Incorrect */
<BarChart width={800} height={400} data={data} />

/* Correct */
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>
```

---

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Heroicons](https://heroicons.com/)
- [Lucide Icons](https://lucide.dev/)
- [Simple Icons](https://simpleicons.org/)
- [Recharts](https://recharts.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
