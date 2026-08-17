from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database import get_db
from app.models import User
from app.models.finance import Estimate, EstimateCategory, EstimateStatus

router = APIRouter(tags=["estimates"])
STAFF = require_roles("Admin", "Accountant", "SiteEngineer", "ProcurementOfficer")

DEFAULT_CATEGORIES = ["Civil Works", "Electrical", "Plumbing", "Interior", "Structural"]
DEFAULT_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected"]


def ensure_defaults(db):
    if db.query(EstimateCategory).count() == 0:
        for n in DEFAULT_CATEGORIES:
            db.add(EstimateCategory(name=n))
        db.commit()
    if db.query(EstimateStatus).count() == 0:
        for n in DEFAULT_STATUSES:
            db.add(EstimateStatus(name=n))
        db.commit()


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.get("/estimate-categories")
def list_categories(db: Session = Depends(get_db), user: User = Depends(STAFF)):
    ensure_defaults(db)
    return [{"id": c.id, "name": c.name} for c in
            db.query(EstimateCategory).order_by(EstimateCategory.name).all()]


@router.post("/estimate-categories", status_code=201)
def create_category(body: NameIn, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    name = body.name.strip()
    existing = db.query(EstimateCategory).filter(EstimateCategory.name.ilike(name)).first()
    if existing:
        return {"id": existing.id, "name": existing.name}
    c = EstimateCategory(name=name)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name}


@router.get("/estimate-statuses")
def list_statuses(db: Session = Depends(get_db), user: User = Depends(STAFF)):
    ensure_defaults(db)
    return [{"id": s.id, "name": s.name} for s in
            db.query(EstimateStatus).order_by(EstimateStatus.name).all()]


@router.post("/estimate-statuses", status_code=201)
def create_status(body: NameIn, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    name = body.name.strip()
    existing = db.query(EstimateStatus).filter(EstimateStatus.name.ilike(name)).first()
    if existing:
        return {"id": existing.id, "name": existing.name}
    s = EstimateStatus(name=name)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name}


class EstimateCreate(BaseModel):
    project_name: str = Field(min_length=1)
    phase: Optional[str] = None
    category_id: int
    drawing_url: Optional[str] = None
    drawing_filename: Optional[str] = None
    total_amount: float = Field(gt=0)
    status_id: int


def estimate_out(e):
    return {"id": e.id, "project_name": e.project_name, "phase": e.phase,
            "category_id": e.category_id, "category": e.category.name if e.category else None,
            "drawing_url": e.drawing_url, "drawing_filename": e.drawing_filename,
            "total_amount": float(e.total_amount),
            "status_id": e.status_id, "current_status": e.status.name if e.status else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "updated_at": e.updated_at.isoformat() if e.updated_at else None}


@router.get("/estimates")
def list_estimates(db: Session = Depends(get_db), user: User = Depends(STAFF)):
    ensure_defaults(db)
    return [estimate_out(e) for e in
            db.query(Estimate).order_by(Estimate.created_at.desc()).all()]


@router.post("/estimates", status_code=201)
def create_estimate(body: EstimateCreate, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    if not db.get(EstimateCategory, body.category_id):
        raise HTTPException(status_code=422, detail="Invalid category")
    if not db.get(EstimateStatus, body.status_id):
        raise HTTPException(status_code=422, detail="Invalid status")
    e = Estimate(project_name=body.project_name.strip(), phase=(body.phase or "").strip() or None,
                 category_id=body.category_id, drawing_url=body.drawing_url,
                 drawing_filename=body.drawing_filename, total_amount=body.total_amount,
                 status_id=body.status_id, created_by=user.id)
    db.add(e)
    db.commit()
    db.refresh(e)
    return estimate_out(e)


@router.delete("/estimates/{estimate_id}", status_code=204)
def delete_estimate(estimate_id: int, db: Session = Depends(get_db),
                    user: User = Depends(require_roles("Admin", "Accountant"))):
    e = db.get(Estimate, estimate_id)
    if not e:
        raise HTTPException(status_code=404, detail="Estimate not found")
    db.delete(e)
    db.commit()
