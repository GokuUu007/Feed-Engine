# FeedEngine design system

The interface uses a Pokémon-inspired accent over a quiet, high-contrast surface palette. Dark mode is the default; the shared theme control switches to light mode and remembers the selection.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg-app` | `#0B0D12` | `#F4F6FA` | Page background |
| `--bg-surface` | `#151923` | `#FFFFFF` | Cards, navigation, panels |
| `--bg-raised` | `#1E2430` | `#E9EDF5` | Inputs and nested surfaces |
| `--border` | `#2A3140` | `#D3D9E5` | Dividers and outlines |
| `--text-primary` | `#F2F4F8` | `#202733` | Headings and primary content |
| `--text-secondary` | `#A3ACBD` | `#657084` | Supporting content |
| `--accent` | `#A48FFF` | `#6246D8` | Links, focus, active controls |
| `--button-accent` | `#6246D8` | `#6246D8` | Filled buttons with white labels |
| `--pokemon-red` | `#ED454E` | `#ED454E` | Notification and Poké Ball accent |
| `--pokemon-yellow` | `#FFD166` | `#B77700` | Brand wordmark accent |

Headings and brand text use Outfit; body copy uses Nunito Sans; counters use Roboto Mono. Cards use a 12px radius and controls use 10px or pill radii.

## Layout and interaction

- Authenticated desktop pages use a navigation rail, a main content column, and a community rail.
- At phone widths, side rails are replaced by a fixed bottom tab bar and content becomes one column.
- Controls keep visible keyboard focus, readable labels, and clear hover/active states.
- Post text is rendered as text; hashtags are styled separately without interpreting user content as HTML.
