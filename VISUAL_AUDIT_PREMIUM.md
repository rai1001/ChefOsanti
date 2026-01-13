# Visual Audit (Premium Baseline)

Categorized findings from quick code/UX review of current ChefOS UI. Severity: P1 crítico, P2 alto, P3 medio.

## Typography
- Titles vary in size/weight per screen (Dashboard, Suppliers, Purchase Orders) (P2) → Unify H1/H2 per system scale.
- Body text sometimes 15–16px instead of 14px (Staff list, Scheduling) (P3) → Normalize body to 14/20; small 12/16.

## Spacing
- Inconsistent vertical rhythm between sections vs cards (Suppliers, Purchase Orders, Staff) (P2) → Standard section padding (16/20) and gap tokens.
- Forms have uneven column gaps (Supplier item form) (P3) → Apply grid with consistent 16px gap and 12px row gap.

## Color
- Accents mix cyan, orange, pink without clear semantic mapping (global) (P2) → Define primary, neutrals, semantic desaturated palette; reserve accent for emphasis only.
- Error states sometimes just red text without container (Staff create error, Supplier errors) (P3) → Use standardized Banner.

## Components
- Buttons vary in radius, padding, focus states (nav vs forms vs inline links) (P2) → Normalize Button tokens and variants (primary/secondary/ghost).
- Inputs/Selects height/padding differ across forms (Purchase Orders, Supplier Detail) (P2) → Standard control height per density.
- Badges ad-hoc (status pills, org chip) (P3) → Standard badge styles with semantic colors.

## Tables / Lists
- Lists used instead of tables and lack alignment (Purchase Orders, Supplier items) (P1) → Use table layout for dense data; numeric columns right-aligned.
- Headers not sticky; row padding inconsistent (P2) → Sticky header, row padding per density.
- Empty states vary; some plain text (Suppliers items, Staff) (P3) → Standard EmptyState in-table.

## Forms
- No error summary and inline errors differ (Purchase Order detail, Supplier item form) (P2) → Standard FormField + error summary for multi-error forms.
- Actions not sticky; long forms can hide CTAs (events/services) (P3) → Sticky footer on long forms.

## Navigation
- PageHeader pattern not universal (Supplier detail, Purchase Orders, Scheduling) (P2) → Apply consistent PageHeader with subtitle/actions.
- Density toggle absent (P1) → Add compact/comfortable toggle globally.

## Feedback states
- Loading often plain text “Cargando...” (Purchase Orders, Supplier Detail items) (P2) → Replace with Skeleton set.
- Error handling inconsistent; some screens missing retry (tables) (P2) → Standard ErrorBanner with retry.
- Toast/notification absent for saves (forms) (P3) → Add reusable toast hook (future).

## Top 15 inconsistencias (rápidas)
1. Purchase Orders list uses list cards; no table alignment.
2. Supplier Detail items lack loading skeleton/error state.
3. PageHeader missing in Supplier Detail, Purchase Orders, Scheduling.
4. No density toggle; controls padded inconsistently.
5. Buttons: mixed padding/radius; no consistent focus ring.
6. Inputs/selects heights differ; lack consistent border/focus.
7. Badges status vary styles (org chip vs status pills).
8. Tables without sticky headers (events, purchasing lists).
9. Numeric values not right-aligned (totals in orders, prices).
10. Empty states inconsistent (plain text vs EmptyState component).
11. Error handling inconsistent; missing retry in lists.
12. Skeletons not reused; text placeholders instead.
13. Forms lack two-column layout and helper text spacing.
14. No tooltip standard; info icons ad-hoc.
15. Navigation CTA spacing inconsistent; logout/button styles differ.
