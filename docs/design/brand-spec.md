# Audicon — Brand Spec

## Visual System
Deep navy product canvas with cobalt action color. Linear/Vercel posture: tight
letter-spacing, hairline borders, system fonts, no shadows except modals.

## Color Tokens

| Token | Value | Role |
|---|---|---|
| `--brand-navy` | `#172554` | Header, sidebar background |
| `--brand-navy-hover` | `#1e3a8a` | Sidebar hover/active bg |
| `--bg` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Cards, inputs, modals |
| `--fg` | `#0f172a` | Primary text |
| `--muted` | `#64748b` | Secondary text, captions |
| `--border` | `#e2e8f0` | Hairline borders |
| `--accent` | `#2563eb` | CTAs, links, active states |
| `--accent-hover` | `#1d4ed8` | Button hover |
| `--accent-muted` | `#eff6ff` | Tinted bg for accent elements |

## Semantic / Status Tokens

| Token | Value | Use |
|---|---|---|
| `--success` | `#16a34a` | Fechada / ok |
| `--warning` | `#d97706` | Em análise / atenção |
| `--danger` | `#dc2626` | Grave / erro |
| `--info` | `#0284c7` | Notificada / info |

## Infraction Severity Tokens

| Severity | Color | Token |
|---|---|---|
| LEVE | `#16a34a` | `--sev-leve` |
| MÉDIA | `#d97706` | `--sev-media` |
| GRAVE | `#dc2626` | `--sev-grave` |

## Infraction Status Tokens

| Status | Color | Token |
|---|---|---|
| ABERTA | `#64748b` | `--st-aberta` |
| EM_ANALISE | `#d97706` | `--st-analise` |
| NOTIFICADA | `#2563eb` | `--st-notificada` |
| FECHADA | `#16a34a` | `--st-fechada` |

## Typography

- **Display / headings:** `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` — weight 600, letter-spacing -0.02em at ≥24px
- **Body:** same stack, weight 400, letter-spacing 0
- **Mono:** `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace`
- **Scale:** 12 · 13 · 14 · 16 · 18 · 20 · 24 · 30 · 36px

## Layout Posture

- Desktop sidebar: 240px fixed, navy bg
- Tablet sidebar: 64px icon-only or off-canvas
- Mobile: hamburger + drawer
- Max content width: 1280px
- Section padding: 24px desktop, 16px mobile
- Card radius: 8px
- Button radius: 6px
- Input radius: 6px
- No box-shadows on inputs; `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` on modals only

## Component Rules

- **Buttons — primary:** `bg: #2563eb`, `color: white`, `radius: 6px`, `padding: 8px 16px`
- **Buttons — secondary:** `border: 1px #e2e8f0`, `bg: white`, `color: #0f172a`
- **Buttons — danger:** `bg: #dc2626`, `color: white`
- **Badges:** inline pill, `font-size: 12px`, `padding: 2px 8px`, `radius: 999px`
- **Tables:** hairline `1px #e2e8f0` borders, `font-variant-numeric: tabular-nums`, no striping
- **Nav active:** `bg: rgba(255,255,255,0.12)`, `color: white`, left `3px #2563eb` accent bar

## Accent Budget

One cobalt element per screen (primary CTA or active nav). Second usage allowed for links inline text. Never flood cards with cobalt backgrounds.
