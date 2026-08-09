import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import auth, projects, clients, uploads, documents, vendors, procurement, finance, users_admin, quotation, notifications, employees
from app.routers.uploads import UPLOAD_DIR
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


@api_router.get("/")
def root():
    return {"message": "Construction Portal API"}


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
                     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"]:
            conn.execute(text(stmt))
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_demo_data(db)
        seed_procurement(db)
        from app.seed_finance import seed_finance
        seed_finance(db)
        from app.seed_finance import seed_employees
        seed_employees(db)
    finally:
        db.close()
