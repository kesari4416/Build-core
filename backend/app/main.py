import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import auth, projects, clients, uploads
from app.routers.uploads import UPLOAD_DIR
from app.seed import seed_admin, seed_demo_data

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Construction Portal API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(clients.router)
api_router.include_router(uploads.router)


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
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_demo_data(db)
    finally:
        db.close()
