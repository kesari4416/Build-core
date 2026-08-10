# PRD — Construction Project Management Portal (BUILDCORE)

## Original Problem Statement
"According to this docs Please the Portal for construction work with more attractive design" — doc: Admin → Project Planning module for a Construction Project Management System (projects, phases, progress updates, client-scoped views, role-based access).

## User Choices
- PostgreSQL + SQLAlchemy (strict requirement — NOT MongoDB)
- JWT email/password auth, roles: Admin, SiteEngineer, Client (Vendor supported in model)
- Seeded demo data (3 clients, 5 projects, phases, updates, demo accounts)
- Real photo file upload (local disk, served at /api/uploads)
- Design: Bold dark industrial theme (zinc + safety orange, Barlow Condensed/IBM Plex Sans)

## Architecture
- Backend: FastAPI + SQLAlchemy (sync) + PostgreSQL 15 (local, `service postgresql start`, auto-started in server.py), Alembic migration files at /app/backend/alembic
- Structure: app/models, app/schemas, app/crud, app/routers (auth, projects, clients, uploads), app/core/security.py, app/database.py, app/main.py
- Auth: JWT httpOnly cookies + Bearer fallback, bcrypt, role deps (require_roles)
- Frontend: React (CRA) + React Query + axios(withCredentials), src/features/projectPlanning/{pages,components,hooks}
- DB: construction_db via DATABASE_URL in backend/.env

## User Personas
- Admin (kesari4416@gmail.com): full CRUD, sees everything
- Site Engineer: create/edit phases & updates on assigned projects
- Client: read-only, own projects only, no internal updates

## Implemented (2026-06)
- 4 user TCs fixed (2026-06, iter 10, TESTED 100%): (TC_PROJECTS_001) New Project location auto-detect — detect-location-button uses browser geolocation + backend proxy GET /api/geo/reverse (Nominatim server-side, falls back to coordinates), manual entry kept; (FINANCE_001) ExpenseCategory model + GET/POST/PATCH/DELETE /api/expense-categories (dup 409; rename propagates onto existing expense entries), Finance page Expense Categories panel (add/list/edit/delete) + expense form category dropdown, 8 seeded; (FINANCE_002/003) project finance summary now returns revenue_last_year/cost_last_year/period_from/period_to (365-day window); cards renamed 'Revenue from Client' + 'Expense' with visible 1-year date range (pf-income-period/pf-cost-period).
- Dashboard analytics — TC_DASHBOARD_001 (2026-06, iter 9, TESTED 100%): GET /api/projects/dashboard-charts (Client-scoped) + seed_milestones (25 across phases). DashboardPage now has all 6 graphs: portfolio progress radial gauge, custom CSS Gantt timeline w/ Today marker, status breakdown bars, schedule variance bars (actual−expected % from planned dates, green/red), milestone tracker donut + upcoming list, projects-by-stage bars (current = first non-completed phase). testids: portfolio-progress-chart, gantt-chart, status-chart, variance-chart, milestone-chart, stages-chart. NOTE: Project model uses start_date_planned/end_date_planned (NOT planned_start).
- Login page: Demo Accounts quick-login section removed on user request (2026-06). Credentials remain in /app/memory/test_credentials.md.
- Client PPT deck generated at /app/frontend/public/downloads/BUILDCORE_Client_Presentation.pptx (13 slides, live screenshots; regenerate via python-pptx if screens change).
- New modules per prompt_for_adding_modules.pdf (2026-06, iteration 4 — ALL TESTED GREEN):
  - Finance: org dashboard /admin/finance (income/cost/profit/outstanding cards, overdue invoices, payroll history), Payroll /admin/finance/payroll (create run → process → mark entries paid), Project Finance /admin/projects/:id/finance (invoices + payments, expense log, summary cards; Finance button on project detail). Endpoints: /api/finance/dashboard-summary, /api/projects/{id}/invoices|payments|expenses|finance/summary, /api/payroll-runs*
  - Client Management: /admin/clients table (active projects, total_billed, status) + ClientFormModal (add/edit), /admin/clients/:id detail with Projects/Invoices/Documents tabs. GET /api/clients now returns total_billed
  - User Management (Admin): /admin/users table w/ role+status filters, UserFormModal (dynamic link-or-create Client/Vendor fields), RoleBadge, disable/enable, reset password, delete, ProjectAssignmentPicker for engineers. Endpoints: /api/users* (POST/PATCH/DELETE, disable, reset-password), /api/projects/{id}/assignments. Roles now include Accountant + ProcurementOfficer
  - Vendor Quotation: /admin/procurement/vendors (vendor directory + org-wide bid package cards via new GET /api/bid-packages), /admin/procurement/bid-packages/:id/comparison (BidComparisonTable: rows=items, cols=vendors, best-price highlight, add line items, Award as PO/Subcontract), Vendor Portal /portal/vendor/bid-packages (+detail w/ line-item quote form, submit/update before due date, upsert). Vendor role auto-redirects from /admin to portal; role-filtered sidebar nav
- Spec addendum Sections 4+5 — Employee Categories + Site Engineer Field Ops (2026-06, iter 6-8, TESTED — backend 12/12 + 11/11 regression, frontend 100% after fix):
  - EmployeeCategory model (org-wide trades, default_wage_type, is_active) + Employee.category_id FK (role_title kept as legacy fallback; employee_out resolves role_title = category.name). Startup runs idempotent ALTER TABLE for category_id. Seed: 6 defaults (Mason, Electrician, Helper, Plumber, Carpenter, Supervisor) + backfill from role_title.
  - Endpoints: POST/GET /api/employee-categories (INTERNAL incl. SE can create; dup name case-insensitive 409), PATCH + /deactivate (Admin/Accountant only). Deactivated categories hidden from list; assigned employees keep them.
  - SE access rules (server-enforced): check_field_access — SE limited to projects where site_engineer_id==user OR project_assignments row (403 otherwise) on all employee/attendance/labour-cost routes; SE PATCH blocked for daily_wage/wage_type/status (403); deactivate employee = Admin/Accountant only. SE CAN set wage at creation (open question 4 resolved: create open, edit gated).
  - Frontend: Field Ops portal /portal/site-engineer (nav for Admin+SiteEngineer) — project selector (auto-scoped), date input (SE clamped min=today-3 max=today; Admin unclamped), one-tap DailyAttendanceCards, marked-count bar, Add Employee. EmployeeFormModal: category dropdown w/ inline '+ Add Category' (EmployeeCategoryFormModal) that auto-selects after create; wage fields locked (wage-locked-note) for SE editing. EmployeesTab deactivate button Admin/Accountant only.
  - BUG FIXED (iter 7-8): inline add-category auto-select — Radix Select fired onValueChange('') after nested modal closed, wiping category_id; fixed by ignoring empty values + explicit SelectValue children + optimistic cache append. Verified by testing agent (iteration_8: 3/3).
  - Full integration chain verified: admin creates category → SE sees it → SE adds employee → SE marks attendance → visible in admin grid → labour cost includes it. NO disconnected modules.
- Spec addendum — Employees, Attendance, Labour Cost + calendar-icon fix (2026-06, iter 5, TESTED 100%):
  - BUG FIX: native date-input calendar icons invisible on dark theme — CSS ::-webkit-calendar-picker-indicator invert(0.75) in index.css (payroll, invoices, labour report, all date fields)
  - Employee model (per-project field workers, no login; wage_type daily/monthly/piece_rate) + Attendance model (UNIQUE(employee_id, attendance_date) enforced at DB, statuses present/absent/half_day/leave)
  - Endpoints (INTERNAL roles only — Admin/SiteEngineer/Accountant/ProcurementOfficer; Client+Vendor 403): POST/GET /projects/{id}/employees, GET/PATCH /employees/{id}, POST /employees/{id}/deactivate (soft, history preserved), POST/GET /projects/{id}/attendance (upsert per emp+date; backdate window: non-Admin today→today-3, Admin exempt), PATCH /attendance/{id}, GET /employees/{id}/attendance, GET /projects/{id}/labour-cost (days: present=1, half_day=0.5; amount=days×daily_wage for daily wage type; month-to-date default)
  - Frontend: Employees tab on Project Detail (hidden for Client/Vendor) — today's one-tap attendance cards (P/½/A/L), 7-day click-to-cycle attendance grid, employee register table (add/edit/deactivate via EmployeeFormModal), labour cost report w/ date range. Components: EmployeesTab, EmployeeFormModal, DailyAttendanceCard, AttendanceMarkGrid
  - Seed: 4 employees on project 1, 2 on project 2, 3 days of attendance. Tests: /app/backend/tests/test_iter5_employees.py (11 green)
- Blocked Work Alerts (2026-06, TESTED): Notification model + /api/notifications (list, unread-count, {id}/read, read-all). Triggers: phase status changed to Blocked/Delayed (PATCH /phases/{id}) and progress updates flagged Blocked/Delayed (POST /projects/{id}/updates). Recipients: all Admins + project's site engineer, actor excluded. Frontend: NotificationBell in sidebar (Admin + SiteEngineer only) — unread badge (30s poll), popover list, click marks read + navigates to project, Mark-all-read. Verified via curl (notify/self-exclude/read flows) + Playwright (badge → open → click → navigate → badge cleared).
- Procurement module (2026-06): Vendors (+documents, insurance expiry tracking, expiring_insurance filter), Bid Packages/Invitations/Bids/Award→creates draft PO or Subcontract, Purchase Orders (+line items, approve gated on current vendor insurance → 422, cancel), Subcontracts (retainage_pct, approve/execute both insurance-gated), Change Orders (Admin approve recomputes revised_amount/committed_amount), Pay Applications (retainage auto = amount × retainage_pct, submit/approve/mark-paid, G702/G703 line items w/ pct_complete, lien waivers), Material Deliveries, Procurement Documents (default internal, client-scoped route), CostCodeBudget table for over_budget + variance breakdown. Dashboard: GET /projects/{id}/procurement/dashboard-summary + /commitments (filters: type, status['open'], vendor_id, cost_code, pending_approval, over_budget) + /budget-breakdown. Frontend: ProcurementDashboardPage (4 filter stat cards, URL params, variance dialog red-if-negative, commitments table w/ pending & over-budget flags), CommitmentDetailPage (Overview w/ approve/execute/cancel, Change Orders tab, Pay Apps tab w/ full lifecycle + line items + waivers, Documents tab). Components: CommitmentStatusBadge, ChangeOrderCard, LineItemTable, LienWaiverRow, ProcurementDocumentsPanel. Statuses kept CamelCase.
- Full CRUD: projects (soft-delete/archive via DELETE + POST /archive), phases (unique sequence_order → 409, reorder endpoint), progress updates (phase-scoped or project-level, DELETE endpoint), milestones (per-phase CRUD, Done sets completed_at — backend only, no UI yet)
- Business rules: computed percent_complete (avg of phases), has_active_issues (phase Delayed/Blocked OR latest update flag Delayed/Blocked), role-based write access, client data isolation, visible_to_client filtering
- Filters (client/status/engineer/search/has_issues/start_date/end_date) + limit/offset pagination on projects & updates
- Endpoints: /api/auth/*, /api/projects* (+dashboard-summary), /api/phases/* (+milestones), /api/clients/{id}/projects(/updates)(/documents), /api/documents/*, /api/users, /api/stats, /api/upload
- Documents module (2026-06): multipart upload w/ custom display name + category (Drawing/Contract/Invoice/Approval/Other) + client-visibility flag; list/search/filter, rename/change-category (PATCH), delete (admin only), client-scoped hiding; UI panel in Tracking tab (DocumentUploadCard, DocumentListItem, DocumentsPanel)
- Dashboard stat cards (2026-06): 4 clickable filter cards on /admin/projects (Total/Ongoing/With Issues/Total Budget) from GET /projects/dashboard-summary; URL-reflected filters (?status=Ongoing, ?has_issues=true), budget breakdown dialog, live count updates via React Query invalidation; DashboardStatCard component
- Project model: added project_type + currency columns; Phase status now includes Blocked
- Frontend: Login (split-screen, demo account buttons), Dashboard (stat cards + recharts), Project List (filters, debounced search, pagination, New Project modal w/ validation), Project Detail (Overview/Phases stepper timeline/Tracking feed w/ optimistic updates + photo upload + documents panel), Clients page, Client Projects page, role-based UI hiding
- Tests: 16 core + 20 planning + 17 procurement + 14 iter4 backend pytest passing (/app/backend/tests/); testing agent iterations 1-4 all green
- Deployment guide PDF: /app/BUILDCORE_Ubuntu24_Nginx_Installation_Guide.pdf (also served at frontend /public), paths use /var/www/buildcore

- FINANCE_004 UI fix (2026-06, VERIFIED via screenshot): Profit card on ProjectFinancePage now shows 1-year period subtitle (data-testid pf-profit-period rendered via ProjectFinanceSummaryCard sub prop). Backend 1-yr profit already verified in iteration 11. All 4 bug reports (FINANCE_004, VENTORS_001, FIELDOPS_001, PROJECT_002) fully closed.

- Balance Sheets + Invoice Share (2026-06, iter 12, TESTED 100%):
  - GET /api/finance/balance-sheet (Admin/Accountant): per-project budget/credit/debit/profit_loss sorted losses-first, breakdown (staff_payroll, labour_wages from attendance, expenses, procurement), totals, overall_profit/overall_loss, loss_projects, employee_dues (pending payroll + daily-wage labour by category)
  - GET /api/projects/{id}/balance-sheet (staff): budget, client_paid, client_outstanding, released breakdown, balance, budget_remaining, transactions latest-first incl daily labour-wage debit entries
  - Frontend: /admin/finance now has Overview + Balance Sheet tabs (OrgBalanceSheetTab — loss projects red-highlighted, employee dues panel); Project Detail has new 'balance sheet' tab (ProjectBalanceSheetTab — 4 cards + money-out breakdown + latest-first transaction table); hidden from Client/Vendor
  - Invoice Print/WhatsApp/Email buttons (device-based, no keys): utils/invoiceShare.js — printable BUILDCORE invoice window, wa.me + mailto share; on InvoiceCard (project finance + client detail) and overdue invoices on org Finance
  - Tests: /app/backend/tests/test_iter12_balance_sheet.py (8/8 RBAC + math)

- Balance Sheet Export (2026-06, SELF-TESTED: curl all 4 formats + RBAC + real UI download events):
  - New router /app/backend/app/routers/exports.py: GET /api/finance/balance-sheet/export?fmt=pdf|xlsx (Admin/Accountant) and GET /api/projects/{id}/balance-sheet/export?fmt=pdf|xlsx (staff) — reportlab PDFs (loss rows red, dues section) + openpyxl workbooks (Balance Sheet + Employee Dues / Summary + Transactions sheets); filenames dated, project slugged
  - Frontend: Export PDF / Export Excel buttons on both balance sheet tabs (bs-export-pdf/excel, pbs-export-pdf/excel); shared utils/downloadFile.js (blob download, filename from Content-Disposition)
  - openpyxl added to requirements.txt

## Backlog / Next
- P1: Milestones UI (backend ready); edit progress updates
- P2: Replace window.prompt/confirm dialogs (record payment, reset password, delete user, award) with shadcn Dialogs; email channel for alerts (needs Resend/SendGrid key); Gantt view; export reports; invoice PDF export
- Perf note (from code review, non-blocking): N+1 queries in GET /bid-packages and GET /clients — fold into GROUP BY joins if data grows
- Note: PostgreSQL is locally installed in the container. Container resets WIPE apt packages + postgres data (happened again 2026-06 during iter4; reinstalled via `apt-get install -y postgresql`, then `ALTER USER postgres WITH PASSWORD 'postgres'; CREATE DATABASE construction_db;`, restart backend — seed repopulates). server.py auto-starts postgres if binaries exist. Emergent deployment officially supports MongoDB; Postgres persistence is a known risk.
