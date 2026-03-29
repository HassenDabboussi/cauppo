---
title: Style Selection
impact: MEDIUM
impactDescription: Inconsistent styles or mismatched style-to-product choices undermine professionalism and trust.
tags: [style, consistency, icons, branding, glassmorphism, minimalism]
---

# Style Selection

Rules for choosing and maintaining consistent visual styles.

## style-match

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

Use the design system generator for tailored recommendations:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product> <industry>" --design-system
```

## consistency

Use the **same style** across all pages and components. Never mix multiple visual languages.

```
✗ Homepage: glassmorphism → Dashboard: flat → Settings: material
✓ Homepage: glassmorphism → Dashboard: glassmorphism → Settings: glassmorphism
```

If using a generated design system, persist it:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

## no-emoji-icons

**Never** use emojis as UI icons. Use SVG icon libraries.

```html
<!-- Incorrect — emojis as icons -->
<span>🎨</span> Design
<span>🚀</span> Deploy

<!-- Correct — SVG icons from Lucide/Heroicons -->
<Palette className="w-5 h-5" /> Design
<Rocket className="w-5 h-5" /> Deploy
```

Recommended icon sets:
- **Lucide** — Clean, consistent, MIT license
- **Heroicons** — Tailwind-native, by Tailwind Labs
- **Simple Icons** — Brand/logo SVGs
- **Phosphor** — Flexible weights (thin, light, regular, bold, fill)

## consistent-icon-sizing

Use a fixed `viewBox` (typically 24×24) and consistent sizing classes.

```html
<!-- Incorrect — random sizes -->
<Icon1 className="w-4 h-4" />
<Icon2 className="w-6 h-6" />
<Icon3 className="w-8 h-8" />

<!-- Correct — consistent size system -->
<!-- sm: w-4 h-4 | md: w-5 h-5 | lg: w-6 h-6 -->
<Icon1 className="w-5 h-5" />
<Icon2 className="w-5 h-5" />
<Icon3 className="w-5 h-5" />
```

## brand-logos

Always verify brand logos from official sources. Use Simple Icons or the brand's press kit.

```html
<!-- Incorrect — guessed SVG path -->
<svg><!-- made-up logo --></svg>

<!-- Correct — from Simple Icons -->
<img src="https://cdn.simpleicons.org/github" alt="GitHub" class="h-6" />
```
