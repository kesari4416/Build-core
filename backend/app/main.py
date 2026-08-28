import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import auth, projects, clients, uploads, documents, vendors, procurement, finance, users_admin, quotation, notifications, employees, exports, vendor_products, change_orders, transactions, estimates, quotations_v2, concepts
from app.routers.uploads import UPLOAD_DIR
from app.models import concepts as _concepts_models  # noqa: F401 — register tables
from app.seed import seed_admin, seed_demo_data
from app.seed_procurement import seed_procurement

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Construction Portal API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(clients.router)
api_router.include_router(uploads.router)
api_router.include_router(documents.router)
api_router.include_router(vendors.router)
api_router.include_router(procurement.router)
api_router.include_router(finance.router)
api_router.include_router(users_admin.router)
api_router.include_router(quotation.router)
api_router.include_router(notifications.router)
api_router.include_router(employees.router)
api_router.include_router(exports.router)
api_router.include_router(vendor_products.router)
api_router.include_router(change_orders.router)
api_router.include_router(transactions.router)
api_router.include_router(estimates.router)
api_router.include_router(quotations_v2.router)
api_router.include_router(concepts.router)


@api_router.get("/")
def root():
    return {"message": "Construction Portal API"}


@api_router.get("/user-manual")
def download_user_manual():
    """Serve the Sitera User Manual PDF."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    from pathlib import Path
    p = Path("/app/docs/Sitera_User_Manual.pdf")
    if not p.exists():
        raise HTTPException(status_code=404, detail="User manual not found")
    return FileResponse(str(p), media_type="application/pdf", filename="Sitera_User_Manual.pdf")


app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # Initialise object storage — non-fatal if it fails (offline dev)
    try:
        from app.core.object_storage import init_storage
        init_storage()
    except Exception as _e:
        logging.warning("Object storage init failed: %s", _e)
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS category_id "
                          "INTEGER REFERENCES employee_categories(id)"))
        conn.execute(text("ALTER TABLE employees ALTER COLUMN project_id DROP NOT NULL"))
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR"))
        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'INR'"))
        for stmt in ["ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR",
                     "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Active'",
                     "ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_vendor_id INTEGER",
                     "ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary NUMERIC(14,2)",
                     "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
                     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR",
                     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id VARCHAR",
                     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT",
                     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
                     "ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_id INTEGER",
                     "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_direction VARCHAR DEFAULT 'incoming'",
                     "UPDATE payments SET payment_direction = 'incoming' WHERE payment_direction IS NULL",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES phases(id)",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS source_type VARCHAR",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS source_id INTEGER",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS product_id INTEGER",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS payment_type VARCHAR",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS balance_after NUMERIC(14,2)",
                     "ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS quotation_id INTEGER",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approval_state VARCHAR DEFAULT 'pending'",
                     "UPDATE estimates SET approval_state = 'pending' WHERE approval_state IS NULL",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_email VARCHAR",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS linked_project_id INTEGER REFERENCES projects(id)",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approval_token VARCHAR",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS token_used BOOLEAN DEFAULT FALSE",
                     "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS estimate_date DATE",
                     "ALTER TABLE project_change_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ",
                     "ALTER TABLE estimates ALTER COLUMN project_name DROP NOT NULL",
                     "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS income_entry_id INTEGER REFERENCES income_entries(id)",
                     "CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_income_entry_id ON invoices(income_entry_id) WHERE income_entry_id IS NOT NULL"]:
            conn.execute(text(stmt))
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_demo_data(db)
        seed_procurement(db)
        from app.seed_finance import seed_finance
        seed_finance(db)
        from app.seed_finance import seed_employees, seed_categories, seed_milestones, seed_expense_categories, seed_project_ledgers
        seed_employees(db)
        seed_categories(db)
        seed_milestones(db)
        seed_expense_categories(db)
        seed_project_ledgers(db)
        # Backfill: auto-generate invoices for pre-existing IncomeEntry rows
        # that don't yet have a linked invoice. Safe to re-run on every boot.
        from app.routers.transactions import ensure_invoice_for_income
        from app.models.finance import IncomeEntry
        from app.models import Project as _Project
        for inc in db.query(IncomeEntry).filter(IncomeEntry.project_id.isnot(None)).all():
            proj = db.get(_Project, inc.project_id)
            if proj:
                ensure_invoice_for_income(db, proj, inc, None)
    finally:
        db.close()
