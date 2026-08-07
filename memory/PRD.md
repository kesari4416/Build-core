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
- New modules per prompt_for_adding_modules.pdf (2026-06, iteration 4 — ALL TESTED GREEN):
  - Finance: org dashboard /admin/finance (income/cost/profit/outstanding cards, overdue invoices, payroll history), Payroll /admin/finance/payroll (create run → process → mark entries paid), Project Finance /admin/projects/:id/finance (invoices + payments, expense log, summary cards; Finance button on project detail). Endpoints: /api/finance/dashboard-summary, /api/projects/{id}/invoices|payments|expenses|finance/summary, /api/payroll-runs*
  - Client Management: /admin/clients table (active projects, total_billed, status) + ClientFormModal (add/edit), /admin/clients/:id detail with Projects/Invoices/Documents tabs. GET /api/clients now returns total_billed
  - User Management (Admin): /admin/users table w/ role+status filters, UserFormModal (dynamic link-or-create Client/Vendor fields), RoleBadge, disable/enable, reset password, delete, ProjectAssignmentPicker for engineers. Endpoints: /api/users* (POST/PATCH/DELETE, disable, reset-password), /api/projects/{id}/assignments. Roles now include Accountant + ProcurementOfficer
  - Vendor Quotation: /admin/procurement/vendors (vendor directory + org-wide bid package cards via new GET /api/bid-packages), /admin/procurement/bid-packages/:id/comparison (BidComparisonTable: rows=items, cols=vendors, best-price highlight, add line items, Award as PO/Subcontract), Vendor Portal /portal/vendor/bid-packages (+detail w/ line-item quote form, submit/update before due date, upsert). Vendor role auto-redirects from /admin to portal; role-filtered sidebar nav
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

## Backlog / Next
- P1: Milestones UI (backend ready); Vendor role flows; edit progress updates
- P2: User management UI for Admin; Notification model + email alerts on Blocked updates; Gantt view; export reports
- Note: PostgreSQL is locally installed in the container (reinstalled after container reset on 2026-06 — apt packages/data do not persist across resets; server.py auto-starts postgres and waits via pg_isready, seed repopulates). Emergent deployment officially supports MongoDB; Postgres persistence is a known risk.
a (happened again 2026-06 during iter4; reinstalled via `apt-get install -y postgresql`, then `ALTER USER postgres WITH PASSWORD 'postgres'; CREATE DATABASE construction_db;`, restart backend — seed repopulates). server.py auto-starts postgres if binaries exist. Emergent deployment officially supports MongoDB; Postgres persistence is a known risk.
