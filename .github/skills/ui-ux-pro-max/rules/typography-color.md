---
title: Typography & Color
impact: MEDIUM
impactDescription: Poor typography and color choices reduce readability and brand coherence.
tags: [typography, color, font-pairing, line-height, contrast, palette]
---

# Typography & Color

Rules for readable typography and cohesive color systems.

## line-height

Use **1.5–1.75** line-height for body text. Headings can use **1.1–1.3**.

```css
/* Incorrect — cramped body text */
p { line-height: 1.0; }

/* Correct — comfortable reading */
p { line-height: 1.6; }
h1 { line-height: 1.2; }
```

## line-length

Limit body text to **65–75 characters** per line for optimal readability.

```css
/* Incorrect — full viewport width text */
.content { width: 100%; }

/* Correct — constrained for readability */
.content { max-width: 65ch; }
```

## font-pairing

Match heading/body font personalities. Common pairings:

| Heading | Body | Mood |
|---------|------|------|
| Inter | Inter | Clean, modern, neutral |
| Playfair Display | Lato | Elegant, editorial |
| Montserrat | Open Sans | Professional, approachable |
| Space Grotesk | DM Sans | Tech, modern |
| Fraunces | Work Sans | Premium, warm |

```css
/* Example pairing */
:root {
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
h1, h2, h3 { font-family: var(--font-heading); }
body { font-family: var(--font-body); }
```

## text-contrast-modes

Use appropriate text colors for light and dark modes.

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Heading | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) |
| Body | `#334155` (slate-700) | `#CBD5E1` (slate-300) |
| Muted | `#475569` (slate-600) | `#94A3B8` (slate-400) |
| Border | `#E2E8F0` (gray-200) | `#334155` (slate-700) |

```css
/* Incorrect — too light for body text in light mode */
.body-text { color: #94A3B8; } /* slate-400, ≈2.3:1 on white */

/* Correct */
.body-text { color: #334155; } /* slate-700, ≈8.5:1 on white */
```

## glass-card-modes

Glass/transparent cards need different opacities per mode.

```css
/* Incorrect — too transparent in light mode */
.glass { background: rgba(255, 255, 255, 0.1); } /* invisible */

/* Correct */
.glass-light { background: rgba(255, 255, 255, 0.8); }
.glass-dark  { background: rgba(15, 23, 42, 0.6); }
```

## color-usage

Use theme tokens instead of raw hex values. Apply color semantically.

```css
/* Incorrect — hardcoded colors */
.btn { background: #3B82F6; }

/* Correct — semantic tokens */
.btn { background: var(--color-primary); }
/* or in Tailwind: bg-primary */
```
