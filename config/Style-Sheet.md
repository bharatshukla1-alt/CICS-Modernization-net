/* ============================================================================
   BFSI DESIGN SYSTEM — bfsi-theme.css
   A light-theme stylesheet for Banking, Financial Services & Insurance UIs.
   ----------------------------------------------------------------------------
   Design principles
     • Trust & authority  → deep navy / institutional blue as the primary brand.
     • Clarity & calm      → generous whitespace, restrained accents, no gloss.
     • Data-first          → precise tables, aligned numerals, clear states.
     • Compliance-ready     → WCAG-AA contrast, visible focus, no dark theme.
   ----------------------------------------------------------------------------
   Usage: <link rel="stylesheet" href="bfsi-theme.css">
          Wrap content in normal semantic HTML. Utility + component classes
          are namespace-free but conventional (.btn, .card, .alert, etc.).
   ========================================================================== */

/* ----------------------------------------------------------------------------
   1. DESIGN TOKENS (CSS custom properties)
   -------------------------------------------------------------------------- */
:root {
  /* Brand — institutional navy & blue */
  --color-primary-900: #0a2540;   /* deep navy — headers, primary text on light */
  --color-primary-800: #0f3057;
  --color-primary-700: #12406e;
  --color-primary-600: #16528c;   /* primary action */
  --color-primary-500: #1e63a8;
  --color-primary-400: #4a86c4;
  --color-primary-300: #8db6db;
  --color-primary-100: #dce8f4;
  --color-primary-50:  #eef4fa;

  /* Secondary — trust teal (secondary CTAs, links, highlights) */
  --color-secondary-700: #0b5c66;
  --color-secondary-600: #0e7480;
  --color-secondary-500: #128a97;
  --color-secondary-100: #d5eef1;

  /* Accent — financial gold (sparingly: premium, ratings, emphasis) */
  --color-accent-600: #8f5f0e;   /* darkened for AA text contrast on accent-100 */
  --color-accent-500: #d69e2e;
  --color-accent-100: #faf0d7;

  /* Semantic — status */
  --color-success-700: #1b6b3a;
  --color-success-600: #21804a;
  --color-success-100: #dff3e6;
  --color-warning-700: #8a5a00;
  --color-warning-600: #b47606;
  --color-warning-100: #fbeccd;
  --color-danger-700:  #9b2226;
  --color-danger-600:  #c0353a;
  --color-danger-100:  #fadedf;
  --color-info-700:    #0c5480;
  --color-info-600:    #1173ac;
  --color-info-100:    #d8ecf7;

  /* Neutrals — light theme surfaces & text */
  --color-bg:          #f4f6f9;   /* app background */
  --color-surface:     #ffffff;   /* cards, panels */
  --color-surface-alt: #f8fafc;   /* zebra rows, subtle fills */
  --color-border:      #d9e0e8;
  --color-border-strong:#b9c3cf;
  --color-text:        #1a2634;   /* primary body text */
  --color-text-muted:  #55677a;   /* secondary text */
  --color-text-subtle: #616f80;   /* captions, meta — AA on white */
  --color-text-invert: #ffffff;

  /* Typography */
  --font-sans: "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif;
  --font-mono: "SF Mono", "Roboto Mono", Consolas, "Courier New", monospace;
  --font-num:  "Segoe UI", Roboto, Arial, sans-serif;

  --fs-xs:   0.75rem;   /* 12px */
  --fs-sm:   0.875rem;  /* 14px */
  --fs-base: 1rem;      /* 16px */
  --fs-md:   1.125rem;  /* 18px */
  --fs-lg:   1.375rem;  /* 22px */
  --fs-xl:   1.75rem;   /* 28px */
  --fs-2xl:  2.25rem;   /* 36px */

  --fw-regular: 400;
  --fw-medium:  500;
  --fw-semibold:600;
  --fw-bold:    700;

  --lh-tight: 1.25;
  --lh-base:  1.55;

  /* Spacing scale (4px base) */
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.5rem;
  --sp-6: 2rem;
  --sp-7: 3rem;

  /* Radius — conservative, not playful */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-pill: 999px;

  /* Elevation — soft, restrained */
  --shadow-xs: 0 1px 2px rgba(10, 37, 64, 0.06);
  --shadow-sm: 0 1px 3px rgba(10, 37, 64, 0.08), 0 1px 2px rgba(10, 37, 64, 0.06);
  --shadow-md: 0 4px 12px rgba(10, 37, 64, 0.10);
  --shadow-lg: 0 10px 24px rgba(10, 37, 64, 0.12);

  /* Focus ring — accessibility */
  --focus-ring: 0 0 0 3px rgba(30, 99, 168, 0.35);

  /* Layout */
  --container-max: 1200px;
  --transition: 150ms ease;
}

/* ----------------------------------------------------------------------------
   2. RESET & BASE
   -------------------------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img, svg, video { max-width: 100%; height: auto; display: block; }

a {
  color: var(--color-secondary-600);
  text-decoration: none;
  transition: color var(--transition);
}
a:hover { color: var(--color-secondary-700); text-decoration: underline; }

/* Visible, consistent focus for keyboard users (compliance requirement) */
:focus-visible {
  outline: 2px solid transparent;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-sm);
}

::selection { background: var(--color-primary-100); color: var(--color-primary-900); }

/* ----------------------------------------------------------------------------
   3. TYPOGRAPHY
   -------------------------------------------------------------------------- */
h1, h2, h3, h4, h5, h6 {
  margin: 0 0 var(--sp-3);
  font-weight: var(--fw-semibold);
  line-height: var(--lh-tight);
  color: var(--color-primary-900);
  letter-spacing: -0.01em;
}
h1 { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
h2 { font-size: var(--fs-xl); }
h3 { font-size: var(--fs-lg); }
h4 { font-size: var(--fs-md); }
h5 { font-size: var(--fs-base); }
h6 { font-size: var(--fs-sm); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }

p { margin: 0 0 var(--sp-4); }

small, .text-sm { font-size: var(--fs-sm); }
.text-xs { font-size: var(--fs-xs); }
.text-muted { color: var(--color-text-muted); }
.text-subtle { color: var(--color-text-subtle); }

.lead { font-size: var(--fs-md); color: var(--color-text-muted); line-height: var(--lh-base); }

/* Monetary / numeric — tabular figures keep columns aligned */
.numeric, td.numeric, .amount {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  text-align: right;
}
.amount--positive { color: var(--color-success-700); }
.amount--negative { color: var(--color-danger-700); }

code, kbd, pre { font-family: var(--font-mono); font-size: 0.9em; }

hr { border: none; border-top: 1px solid var(--color-border); margin: var(--sp-5) 0; }

/* ----------------------------------------------------------------------------
   4. LAYOUT HELPERS
   -------------------------------------------------------------------------- */
.container { width: 100%; max-width: var(--container-max); margin-inline: auto; padding-inline: var(--sp-5); }
.stack > * + * { margin-top: var(--sp-4); }
.grid { display: grid; gap: var(--sp-5); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 900px) { .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }

.flex { display: flex; gap: var(--sp-3); }
.flex-between { display: flex; justify-content: space-between; align-items: center; gap: var(--sp-3); }
.items-center { align-items: center; }

/* ----------------------------------------------------------------------------
   5. APP CHROME — top bar & side navigation
   -------------------------------------------------------------------------- */
.app-header {
  background: var(--color-primary-900);
  color: var(--color-text-invert);
  padding: var(--sp-3) var(--sp-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
}
.app-header .brand {
  display: flex; align-items: center; gap: var(--sp-3);
  font-size: var(--fs-md); font-weight: var(--fw-semibold);
  color: var(--color-text-invert); letter-spacing: 0.01em;
}
.app-header .brand-mark {
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  background: var(--color-secondary-500);
  display: grid; place-items: center; font-weight: var(--fw-bold);
}
.app-header nav a { color: rgba(255,255,255,0.82); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); }
.app-header nav a:hover, .app-header nav a[aria-current="page"] {
  color: #fff; background: rgba(255,255,255,0.10); text-decoration: none;
}

.sidebar { background: var(--color-surface); border-right: 1px solid var(--color-border); padding: var(--sp-4); }
.sidebar a {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3); border-radius: var(--radius-md);
  color: var(--color-text-muted); font-weight: var(--fw-medium);
}
.sidebar a:hover { background: var(--color-primary-50); color: var(--color-primary-700); text-decoration: none; }
.sidebar a[aria-current="page"] {
  background: var(--color-primary-100); color: var(--color-primary-800);
  border-left: 3px solid var(--color-primary-600);
}

/* ----------------------------------------------------------------------------
   6. BUTTONS
   -------------------------------------------------------------------------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  font-family: inherit; font-size: var(--fs-sm); font-weight: var(--fw-semibold);
  line-height: 1; padding: 0.65rem 1.15rem; border-radius: var(--radius-md);
  border: 1px solid transparent; cursor: pointer; white-space: nowrap;
  transition: background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition);
}
.btn:focus-visible { box-shadow: var(--focus-ring); }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }

.btn-primary { background: var(--color-primary-600); color: #fff; }
.btn-primary:hover { background: var(--color-primary-700); }
.btn-primary:active { background: var(--color-primary-800); }

.btn-secondary { background: var(--color-secondary-600); color: #fff; }
.btn-secondary:hover { background: var(--color-secondary-700); }

.btn-outline { background: transparent; color: var(--color-primary-700); border-color: var(--color-border-strong); }
.btn-outline:hover { background: var(--color-primary-50); border-color: var(--color-primary-400); }

.btn-ghost { background: transparent; color: var(--color-primary-700); }
.btn-ghost:hover { background: var(--color-primary-50); }

.btn-danger { background: var(--color-danger-600); color: #fff; }
.btn-danger:hover { background: var(--color-danger-700); }

.btn-success { background: var(--color-success-600); color: #fff; }
.btn-success:hover { background: var(--color-success-700); }

.btn-sm { font-size: var(--fs-xs); padding: 0.45rem 0.8rem; }
.btn-lg { font-size: var(--fs-base); padding: 0.85rem 1.6rem; }
.btn-block { width: 100%; }

/* ----------------------------------------------------------------------------
   7. FORMS
   -------------------------------------------------------------------------- */
.form-group { margin-bottom: var(--sp-4); }
label, .form-label {
  display: inline-block; margin-bottom: var(--sp-2);
  font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text);
}
.required::after { content: " *"; color: var(--color-danger-600); }

input[type="text"], input[type="email"], input[type="password"], input[type="number"],
input[type="tel"], input[type="date"], input[type="search"], input[type="url"],
select, textarea, .form-control {
  width: 100%; font-family: inherit; font-size: var(--fs-sm); color: var(--color-text);
  padding: 0.6rem 0.75rem; background: var(--color-surface);
  border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
  transition: border-color var(--transition), box-shadow var(--transition);
}
input::placeholder, textarea::placeholder { color: var(--color-text-subtle); }
input:focus, select:focus, textarea:focus, .form-control:focus {
  outline: none; border-color: var(--color-primary-500); box-shadow: var(--focus-ring);
}
input:disabled, select:disabled, textarea:disabled { background: var(--color-surface-alt); color: var(--color-text-subtle); cursor: not-allowed; }
textarea { min-height: 6rem; resize: vertical; }

.form-hint { display: block; margin-top: var(--sp-1); font-size: var(--fs-xs); color: var(--color-text-subtle); }
.form-error { display: block; margin-top: var(--sp-1); font-size: var(--fs-xs); color: var(--color-danger-700); font-weight: var(--fw-medium); }
input.is-invalid, select.is-invalid, textarea.is-invalid { border-color: var(--color-danger-600); }
input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(192,53,58,0.30); }
input.is-valid { border-color: var(--color-success-600); }

/* Checkbox & radio */
.form-check { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); }
.form-check input { width: auto; accent-color: var(--color-primary-600); }

/* Input group (e.g. currency prefix) */
.input-group { display: flex; }
.input-group .addon {
  display: inline-flex; align-items: center; padding: 0 0.75rem;
  background: var(--color-surface-alt); border: 1px solid var(--color-border-strong);
  color: var(--color-text-muted); font-size: var(--fs-sm); font-weight: var(--fw-semibold);
}
.input-group .addon:first-child { border-right: 0; border-radius: var(--radius-md) 0 0 var(--radius-md); }
.input-group .addon:last-child  { border-left: 0;  border-radius: 0 var(--radius-md) var(--radius-md) 0; }
.input-group input:not(:first-child) { border-radius: 0 var(--radius-md) var(--radius-md) 0; }
.input-group input:not(:last-child)  { border-radius: var(--radius-md) 0 0 var(--radius-md); }

/* ----------------------------------------------------------------------------
   8. CARDS & PANELS
   -------------------------------------------------------------------------- */
.card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;
}
.card-header {
  padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
}
.card-header h3, .card-header h4 { margin: 0; }
.card-body { padding: var(--sp-5); }
.card-footer { padding: var(--sp-4) var(--sp-5); border-top: 1px solid var(--color-border); background: var(--color-surface-alt); }
.card--accent { border-top: 3px solid var(--color-primary-600); }

/* KPI / stat tile — core BFSI dashboard element */
.stat {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: var(--sp-5); box-shadow: var(--shadow-xs);
}
.stat-label { font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
.stat-value { font-family: var(--font-num); font-variant-numeric: tabular-nums; font-size: var(--fs-2xl); font-weight: var(--fw-bold); color: var(--color-primary-900); line-height: 1; }
.stat-delta { display: inline-flex; align-items: center; gap: var(--sp-1); margin-top: var(--sp-2); font-size: var(--fs-sm); font-weight: var(--fw-semibold); }
.stat-delta--up { color: var(--color-success-700); }
.stat-delta--down { color: var(--color-danger-700); }

/* ----------------------------------------------------------------------------
   9. TABLES — data-dense, precise
   -------------------------------------------------------------------------- */
.table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
table.data-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.data-table thead th {
  text-align: left; padding: var(--sp-3) var(--sp-4);
  background: var(--color-primary-50); color: var(--color-primary-800);
  font-weight: var(--fw-semibold); font-size: var(--fs-xs);
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 2px solid var(--color-border-strong); white-space: nowrap;
}
.data-table tbody td { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--color-border); color: var(--color-text); }
.data-table tbody tr:hover { background: var(--color-primary-50); }
.data-table tbody tr:nth-child(even) { background: var(--color-surface-alt); }
.data-table tbody tr:nth-child(even):hover { background: var(--color-primary-50); }
.data-table tfoot td { padding: var(--sp-3) var(--sp-4); font-weight: var(--fw-semibold); background: var(--color-surface-alt); border-top: 2px solid var(--color-border-strong); }
.data-table .numeric { text-align: right; font-variant-numeric: tabular-nums; }

/* ----------------------------------------------------------------------------
   10. BADGES & STATUS PILLS
   -------------------------------------------------------------------------- */
.badge {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  font-size: var(--fs-xs); font-weight: var(--fw-semibold); line-height: 1;
  padding: 0.3rem 0.6rem; border-radius: var(--radius-pill);
}
.badge--neutral { background: var(--color-primary-100); color: var(--color-primary-800); }
.badge--success { background: var(--color-success-100); color: var(--color-success-700); }
.badge--warning { background: var(--color-warning-100); color: var(--color-warning-700); }
.badge--danger  { background: var(--color-danger-100);  color: var(--color-danger-700); }
.badge--info    { background: var(--color-info-100);    color: var(--color-info-700); }
.badge--accent  { background: var(--color-accent-100);  color: var(--color-accent-600); }

/* Status dot for lists/tables */
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: var(--sp-2); vertical-align: middle; }
.status-dot--active { background: var(--color-success-600); }
.status-dot--pending { background: var(--color-warning-600); }
.status-dot--closed { background: var(--color-text-subtle); }
.status-dot--flagged { background: var(--color-danger-600); }

/* ----------------------------------------------------------------------------
   11. ALERTS / NOTICES
   -------------------------------------------------------------------------- */
.alert {
  display: flex; gap: var(--sp-3); align-items: flex-start;
  padding: var(--sp-4); border-radius: var(--radius-md);
  border: 1px solid transparent; border-left-width: 4px; font-size: var(--fs-sm);
}
.alert strong { font-weight: var(--fw-semibold); }
.alert--info    { background: var(--color-info-100);    border-color: var(--color-info-600);    color: var(--color-info-700); }
.alert--success { background: var(--color-success-100); border-color: var(--color-success-600); color: var(--color-success-700); }
.alert--warning { background: var(--color-warning-100); border-color: var(--color-warning-600); color: var(--color-warning-700); }
.alert--danger  { background: var(--color-danger-100);  border-color: var(--color-danger-600);  color: var(--color-danger-700); }

/* Compliance / legal fine print block */
.disclosure {
  font-size: var(--fs-xs); color: var(--color-text-subtle); line-height: var(--lh-base);
  padding: var(--sp-4); background: var(--color-surface-alt);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
}

/* ----------------------------------------------------------------------------
   12. MISC — tabs, breadcrumbs, progress
   -------------------------------------------------------------------------- */
.tabs { display: flex; gap: var(--sp-1); border-bottom: 1px solid var(--color-border); }
.tabs a { padding: var(--sp-3) var(--sp-4); color: var(--color-text-muted); font-weight: var(--fw-medium); border-bottom: 2px solid transparent; }
.tabs a:hover { color: var(--color-primary-700); text-decoration: none; }
.tabs a[aria-selected="true"] { color: var(--color-primary-800); border-bottom-color: var(--color-primary-600); }

.breadcrumb { display: flex; flex-wrap: wrap; gap: var(--sp-2); font-size: var(--fs-sm); color: var(--color-text-subtle); }
.breadcrumb a { color: var(--color-text-muted); }
.breadcrumb li + li::before { content: "/"; margin-right: var(--sp-2); color: var(--color-border-strong); }
.breadcrumb ol, .breadcrumb ul { list-style: none; display: flex; gap: var(--sp-2); margin: 0; padding: 0; }

.progress { height: 8px; background: var(--color-primary-100); border-radius: var(--radius-pill); overflow: hidden; }
.progress-bar { height: 100%; background: var(--color-primary-600); border-radius: var(--radius-pill); }

/* Utility */
.u-mt-0 { margin-top: 0; } .u-mb-0 { margin-bottom: 0; }
.u-text-center { text-align: center; } .u-text-right { text-align: right; }
.u-hidden { display: none; }

/* ----------------------------------------------------------------------------
   13. ACCESSIBILITY & PREFERENCES
   -------------------------------------------------------------------------- */
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; scroll-behavior: auto !important; }
}
/* Force light rendering even where the OS prefers dark (BFSI brand requirement) */
@media (prefers-color-scheme: dark) {
  :root { color-scheme: light; }
}

/* Print — statements, reports */
@media print {
  body { background: #fff; color: #000; }
  .app-header, .sidebar, .btn { display: none !important; }
  .card, .table-wrap { box-shadow: none; border-color: #999; }
}
