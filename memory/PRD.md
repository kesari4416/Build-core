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
- Full CRUD: projects (soft-delete/archive), phases (unique sequence_order → 409), progress updates (phase-scoped or project-level)
- Business rules: computed percent_complete (avg of phases), has_active_issues (Blocked/Delayed update or Delayed phase), role-based write access, client data isolation, visible_to_client filtering
- Filters (client/status/engineer/search) + limit/offset pagination on projects & updates
- Endpoints: /api/auth/*, /api/projects*, /api/phases/*, /api/clients/{id}/projects(/updates), /api/users, /api/stats, /api/upload
- Frontend: Login (split-screen, demo account buttons), Dashboard (stat cards + recharts), Project List (filters, debounced search, pagination, New Project modal w/ validation), Project Detail (Overview/Phases stepper timeline/Tracking feed w/ optimistic updates + photo upload), Clients page, Client Projects page, role-based UI hiding
- 16/16 backend pytest passing (/app/backend/tests/test_api.py); frontend testing agent 18/18 after query-key fix (iteration_1)

## Backlog / Next
- P1: Vendor role flows (no UI yet); edit/delete progress updates; phase actual dates auto-set
- P2: User management UI for Admin (register endpoint exists, admin-only); email notifications on Blocked updates; Gantt view; export reports
- Note: PostgreSQL is locally installed in the container — Emergent deployment officially supports MongoDB; deployment persistence of Postgres data is a known risk.
