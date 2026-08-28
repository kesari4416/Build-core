# Sitera — Construction Project Management Portal (PRD)

## Original Problem Statement
Build a comprehensive construction project management portal covering: Projects, Phases, Field Ops (attendance, labour payments), Clients, Finance (Ledger, Balance Sheet, Payroll, Invoicing), Estimates, Procurement (Vendor Catalog, Quotations, Bid Packages), Change Orders, and Portals for Vendors + Site Engineers + Clients. Must be fully mobile responsive.

## Tech Stack
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: React + Tailwind CSS + shadcn/ui + React Query
- Auth: JWT (httpOnly cookies + Bearer fallback)

## Design System — "Architectural Swiss" (Phase 1 landed 2026-02-28)
Reference: "Zoho Books but nicer" (user's verbatim direction). Mobile-first priority.
- Typography: Outfit (headings, tight tracking) + IBM Plex Sans body + JetBrains Mono for numeric ledgers; tabular-nums globally
- Colors: Slate base + Amber-600 (light) / Amber-500 (dark) as brand accent (used only for active states + focus rings)
- Radii: rounded-xl cards, rounded-lg buttons/inputs
- Motion: hover lift, tap-scale, glass sticky headers
- Primary CTA: slate-900 background with white text (Zoho-inspired), NOT amber
- Sidebar: deep slate-950 with subtle amber active pill (bg-amber-500/10 ring-amber-500/20)
- Full spec at `/app/design_guidelines.json`

## What's Implemented (recent → oldest)
- **2026-02-28 Phase 1 Redesign — Foundations**: New color tokens (light + dark), typography upgrade to Outfit, glass sticky headers, sidebar refresh with amber active pills, all 4 StatCard variants unified (Dashboard local, DashboardStatCard, OrgBalanceSheetTab, ProjectBalanceSheetTab) — icon chip + Outfit numerals + hover lift, Login page split-screen refined with inline SITE**RA** wordmark, 38 files bulk-updated to slate-primary buttons (was blue-600) and amber focus rings
- **2026-02-27** — Global layout overflow fix (min-width:0 grid/flex, overflow-x:clip root, num-wrap utility, responsive stat cards for large budgets)
- **2026-02-26** — Auto-invoice on client income: `Invoice.income_entry_id` FK with partial unique index, `ensure_invoice_for_income` helper, `paid_sum` treats linked income as paid, startup backfill for pre-existing rows
- **2026-02-25** — Balance Sheet rebuilt as accounting ledger (7 cols, Opening b/f, Totals/Closing c/f, voucher numbers, Rs. Indian-comma format)
- Full Vendor Product Catalog + Quotation workflow, mobile drawer sidebar, 10-item QA fixes

## Prioritized Backlog
- **P1 Phase 2 (Redesign continued)**: Project Detail tabs (Overview/Phases/Tracking/Change Orders/Employees), Estimates page, Vendors + Procurement, Site Engineer + Vendor + Client portals — apply the new design language
- **P1 Phase 3**: Ledger PDF/Excel exports match new 7-column ledger, Voucher drill-down (click voucher → open source transaction)
- **P1 Phase 4**: Double-entry accounting (Chart of Accounts, Vouchers, Trial Balance, Day Book)
- **P2**: Balance Sheet date range filter, fresh Google App Password for SMTP

## Known Environmental Issues
- PostgreSQL in the preview container drops periodically → run `bash /app/scripts/restore_postgres.sh`
- User self-hosts on EC2 (sitera.in); when they report 500s not reproducible in preview, provide raw SQL for schema patches
- On production, keep `SEED_DEMO_DATA=false` in backend .env so demo data doesn't re-seed after wipe

## Key Files
- Design: `/app/design_guidelines.json`, `/app/frontend/src/index.css` (tokens + utility classes)
- Layout: `/app/frontend/src/components/Layout.jsx` (sidebar + mobile drawer + glass header)
- StatCards: `DashboardPage.jsx`, `DashboardStatCard.jsx`, `OrgBalanceSheetTab.jsx`, `ProjectBalanceSheetTab.jsx`
- Backend: `/app/backend/app/routers/finance.py`, `routers/transactions.py`, `main.py`, `models/finance.py`
