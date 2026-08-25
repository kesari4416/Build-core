# Sitera — Construction Project Management Portal (PRD)

## Original Problem Statement
Build a comprehensive construction project management portal covering: Projects, Phases, Field Ops (attendance, labour payments), Clients, Finance (Ledger, Balance Sheet, Payroll, Invoicing), Estimates, Procurement (Vendor Catalog, Quotations, Bid Packages), Change Orders, and Portals for Vendors + Site Engineers + Clients. Must be fully mobile responsive.

## Tech Stack
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: React + Tailwind CSS + shadcn/ui + React Query
- Auth: JWT (httpOnly cookies + Bearer fallback)

## What's Implemented (recent → oldest)
- **2026-02-25** — Rebuilt Project Balance Sheet as a standard accounting ledger:
  - 7-column layout: Date, Voucher No., Particulars, Type badge, Debit (Out), Credit (In), Balance
  - Opening Balance b/f as very first row, Totals / Closing Balance c/f as very last row
  - Voucher numbers auto-generated per type (RCPT-###, PYMT-###, CO-###) in chronological order
  - Row-by-row running balance (`Prev + Credit − Debit`)
  - Consistent `Rs. X,XX,XXX.00` Indian-comma format across summary cards, breakdown, and table
  - Negative amounts shown as `(Rs. XXX.XX)` in red (accounting convention)
  - File: `/app/frontend/src/features/projectPlanning/components/ProjectBalanceSheetTab.jsx`
- Phase Edit → auto-100% when status = Completed
- Balance Sheet running balance math + chronological sort (credits before debits same day)
- 10-item QA batch: Tracking edit/delete, CO payments UI, Gantt bounds, INR formatting, Client sort, Estimate status
- Full mobile responsive layout (drawer sidebar, adaptive grids)
- Estimate module upgrade (phase sync, requirement rows, live totals)
- Vendor Product Catalog + Quotation workflow
- Phase Crew Scoping + cross-project exclusivity

## Prioritized Backlog
- **P1** Double-entry accounting layer (Chart of Accounts, Vouchers, Trial Balance, Day Book)
- **P2** Balance Sheet date range filter (month / custom period)
- **P2** Fresh Google App Password for SMTP (approval + receipt emails)

## Known Environmental Issues
- PostgreSQL in the preview container drops periodically → run `bash /app/scripts/restore_postgres.sh`
- User self-hosts on EC2; when they report 500s not reproducible in preview, provide raw SQL for schema patches

## Key Files
- Backend: `/app/backend/app/routers/finance.py` (`project_balance_sheet`, `project_ledger`)
- Frontend: `/app/frontend/src/features/projectPlanning/components/ProjectBalanceSheetTab.jsx`
