# VISUAL SYSTEM (Premium v1)

Tokens (Tailwind via CSS vars in `src/index.css`)
- Typography: H1 24/28; H2 18/24; body 14/20; small 12/16.
- Radius: base 12px; card 16px.
- Shadows: `var(--ds-shadow-sm)=0 1px 2px rgba(15,23,42,0.24)`; `var(--ds-shadow-md)=0 10px 30px rgba(0,0,0,0.25)`.
- Spacing scale: 4, 8, 12, 16, 24, 32.
- Colors: neutral bg `#0b1120/151e32`, border `#1f2937`, text `#e2e8f0`; primary `#0ea5e9` (hover `#0284c7`), success `#16a34a`, warn `#f59e0b`, error `#ef4444` (desaturated tints).
- Control heights (density-driven): compact 40px; comfortable 48px.

Density
- Data attribute `data-density=compact|comfortable` on layout & root.
- Compact (default): tighter table rows (`--ds-table-row-y:10px`), control height 40px, gaps 8–12px.
- Comfortable: control height 48px, table row Y padding 14px, gaps +4px.

Component rules (implemented as utility classes)
- Button: `.ds-btn` base; variants `.ds-btn-primary` (filled), `.ds-btn-ghost` (subtle), `.ds-btn-danger`. Padding uses vars; icon gap 8px; focus ring primary 2px.
- Input/Select/Textarea: `.ds-input` height via var, rounded 12px, border `--ds-border`, focus `--ds-primary`.
- Checkbox: use existing styling; apply consistent focus ring class `focus-visible:ring-2 ring-offset-2 ring-[--ds-primary]`.
- Badge: `.ds-badge` neutral; semantic modifiers `.is-success/.is-warn/.is-error/.is-info`.
- Card/Section: `.ds-card` background neutral, border subtle, radius 16px, padding 16–20; section headers use `.ds-section-header`.
- PageHeader: title/subtitle/actions block; spacing tokenized.
- Table: `.ds-table` with sticky header, row padding via density vars, numeric cells right-aligned (`.is-num`), action column right, empty/error rows standardized.
- Tooltip: `.ds-tooltip` wrapper uses existing component.
- Banner: `.ds-banner` for info/warn/error with icon slot.
- Skeleton: `.ds-skeleton` default height 16, radius 10.
- Dialog/ConfirmDialog: already exists; use tokens for padding/radius/shadow.

Behavioral rules
- Hover/focus durations 120ms; transitions limited to color/opacity/transform (small).
- Skeleton over spinners except where action-specific.
- Empty states include CTA link/button.
- Error states include retry when data fetch supports it.
- Tables: headers sticky when scrollable; numeric cols right aligned; text truncates with ellipsis + tooltip for overflow; action column fixed width.

Application scope for PRs
- PR-PREMIUM-1: add tokens + density toggle; normalize buttons/inputs/badges; PageHeader everywhere; shared skeleton/empty/error banners.
- PR-PREMIUM-2: refactor key tables (Purchase Orders list, Supplier items, Scheduling) to `.ds-table` with alignment, sticky header, density support.
- PR-PREMIUM-3 (future): refactor key forms to 2-column layouts with sticky actions and consistent errors/toasts.
