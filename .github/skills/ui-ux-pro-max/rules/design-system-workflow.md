---
title: Design System Workflow
impact: HIGH
impactDescription: Following a structured design workflow ensures consistent, professional results across pages and sessions.
tags: [workflow, design-system, search, cli, persist, pages]
---

# Design System Workflow

Step-by-step process for generating and applying design systems using the CLI tool.

## Step 1: Analyze Requirements

Extract from the user request:
- **Product type** — SaaS, e-commerce, portfolio, dashboard, landing page
- **Style keywords** — minimal, playful, professional, elegant, dark mode
- **Industry** — healthcare, fintech, gaming, education, beauty
- **Stack** — React, Vue, Next.js, or default to `html-tailwind`

## Step 2: Generate Design System (REQUIRED)

Always start with `--design-system`:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This searches 5 domains in parallel (product, style, color, landing, typography) and returns a complete design system: pattern, style, colors, typography, effects, and anti-patterns.

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

## Step 3: Supplement with Domain Searches

After the design system, use targeted searches for additional details:

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

## Step 4: Stack Guidelines

Get implementation-specific best practices:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

## Output Formats

```bash
# ASCII box (terminal)
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown (documentation)
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

## Tips for Better Results

1. **Be specific** — `"healthcare SaaS dashboard"` > `"app"`
2. **Search multiple times** — Different keywords reveal different insights
3. **Combine domains** — Style + Typography + Color = complete system
4. **Always check UX** — Search `"animation"`, `"z-index"`, `"accessibility"`
5. **Use stack flag** — Get implementation-specific best practices
6. **Iterate** — Try different keywords if first results don't match
