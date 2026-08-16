import json
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import (Notification, Phase, Project, ProjectChangeOrder,
                        ProjectChangeOrderEvent, ProjectChangeOrderRevision, User)

router = APIRouter(tags=["change-orders"])
CONTRACTOR = require_roles("Admin", "SiteEngineer")
CATEGORIES = ["Client Modification", "Rework", "Design Change", "Site Condition"]


def f(x):
    return float(x) if x is not None else 0.0


def co_totals(db, project_id):
    cos = db.query(ProjectChangeOrder).filter(ProjectChangeOrder.project_id == project_id).all()
    approved = round(sum(f(c.approved_cost if c.approved_cost is not None else c.estimated_cost)
                         for c in cos if c.status == "Approved"), 2)
    pending = round(sum(f(c.estimated_cost) for c in cos
                        if c.status in ("Pending Client Review", "Revision Requested")), 2)
    return approved, pending, sum(1 for c in cos if c.status == "Approved")


def approved_co_entries(db, project_id):
    return [{"date": c.approval_date.date().isoformat() if c.approval_date else None,
             "type": "variation",
             "description": f"Variation: {c.co_number} — {c.title} ({c.category})",
             "amount": f(c.approved_cost if c.approved_cost is not None else c.estimated_cost)}
            for c in db.query(ProjectChangeOrder)
            .filter(ProjectChangeOrder.project_id == project_id,
                    ProjectChangeOrder.status == "Approved").all()]


def co_out(c, users=None, phases=None, detail=False):
    users = users or {}
    out = {"id": c.id, "project_id": c.project_id, "phase_id": c.phase_id,
           "phase_name": (phases or {}).get(c.phase_id), "co_number": c.co_number,
           "title": c.title, "description": c.description, "category": c.category,
           "requested_by": users.get(c.requested_by), "date_requested": c.date_requested.isoformat() if c.date_requested else None,
           "estimated_cost": f(c.estimated_cost), "estimated_time_impact_days": c.estimated_time_impact_days or 0,
           "status": c.status, "approved_cost": f(c.approved_cost) if c.approved_cost is not None else None,
           "approval_date": c.approval_date.isoformat() if c.approval_date else None,
           "approved_by": users.get(c.approved_by),
           "attachments": json.loads(c.attachments) if c.attachments else [],
           "version_count": len(c.revisions),
           "revisions": [{"version": r.version, "estimated_cost": f(r.estimated_cost),
                          "estimated_time_impact_days": r.estimated_time_impact_days or 0,
                          "note": r.note, "by": users.get(r.created_by),
                          "at": r.created_at.isoformat() if r.created_at else None} for r in c.revisions],
           "events": [{"action": e.action, "comment": e.comment, "by": users.get(e.actor_id),
                       "at": e.created_at.isoformat() if e.created_at else None} for e in c.events]}
    return out


def check_co_access(user, project):
    if user.role == "Vendor":
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == "Client" and project.client_id != user.client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this project")


def log_event(db, co, user, action, comment=None):
    db.add(ProjectChangeOrderEvent(change_order_id=co.id, action=action, comment=comment, actor_id=user.id))


def notify_clients(db, project, actor, title, message):
    clients = db.query(User).filter(User.role == "Client", User.client_id == project.client_id,
                                    User.status != "Disabled").all()
    for u in clients:
        if u.id != actor.id:
            db.add(Notification(user_id=u.id, type="ChangeOrder", title=title,
                                message=message, project_id=project.id))


def notify_team(db, project, actor, title, message):
    ids = {u.id for u in db.query(User).filter(User.role == "Admin", User.status != "Disabled").all()}
    if project.site_engineer_id:
        ids.add(project.site_engineer_id)
    ids.discard(actor.id)
    for uid in ids:
        db.add(Notification(user_id=uid, type="ChangeOrder", title=title,
                            message=message, project_id=project.id))


class COCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    category: str = "Client Modification"
    phase_id: Optional[int] = None
    estimated_cost: float = Field(ge=0)
    estimated_time_impact_days: int = Field(default=0, ge=0)
    attachments: List[dict] = []
    submit: bool = True


class CORevise(BaseModel):
    estimated_cost: float = Field(ge=0)
    estimated_time_impact_days: int = Field(default=0, ge=0)
    note: Optional[str] = None


class COAction(BaseModel):
    comment: Optional[str] = None
    confirm: bool = False


def _maps(db, project_id):
    users = {u.id: u.name for u in db.query(User).all()}
    phases = {p.id: p.name for p in db.query(Phase).filter(Phase.project_id == project_id).all()}
    return users, phases


def get_co_or_404(db, co_id):
    co = db.get(ProjectChangeOrder, co_id)
    if not co:
        raise HTTPException(status_code=404, detail="Change order not found")
    return co


@router.get("/projects/{project_id}/change-orders")
def list_change_orders(project_id: int, phase_id: Optional[int] = None, category: Optional[str] = None,
                       status: Optional[str] = None, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    check_co_access(user, project)
    q = db.query(ProjectChangeOrder).filter(ProjectChangeOrder.project_id == project_id)
    if phase_id:
        q = q.filter(ProjectChangeOrder.phase_id == phase_id)
    if category:
        q = q.filter(ProjectChangeOrder.category == category)
    if status:
        q = q.filter(ProjectChangeOrder.status == status)
    users, phases = _maps(db, project_id)
    cos = q.order_by(ProjectChangeOrder.created_at.desc()).all()
    approved, pending, n_approved = co_totals(db, project_id)
    budget = f(project.budget or 0)
    return {"summary": {"original_budget": budget, "approved_variations": approved,
                        "revised_contract_value": round(budget + approved, 2),
                        "pending_co_value": pending, "approved_count": n_approved,
                        "increase_pct": round(approved / budget * 100, 2) if budget else 0},
            "change_orders": [co_out(c, users, phases) for c in cos]}


@router.post("/projects/{project_id}/change-orders", status_code=201)
def create_change_order(project_id: int, body: COCreate, db: Session = Depends(get_db),
                        user: User = Depends(CONTRACTOR)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=422, detail=f"category must be one of {CATEGORIES}")
    if body.phase_id and not db.query(Phase).filter(Phase.id == body.phase_id,
                                                    Phase.project_id == project_id).first():
        raise HTTPException(status_code=422, detail="Phase does not belong to this project")
    seq = db.query(ProjectChangeOrder).filter(ProjectChangeOrder.project_id == project_id).count() + 1
    co = ProjectChangeOrder(project_id=project_id, phase_id=body.phase_id,
                            co_number=f"CO-{project_id}-{seq:03d}", title=body.title.strip(),
                            description=body.description, category=body.category,
                            requested_by=user.id, date_requested=date.today(),
                            estimated_cost=body.estimated_cost,
                            estimated_time_impact_days=body.estimated_time_impact_days,
                            attachments=json.dumps(body.attachments) if body.attachments else None,
                            status="Pending Client Review" if body.submit else "Draft")
    co.revisions.append(ProjectChangeOrderRevision(
        version=1, estimated_cost=body.estimated_cost,
        estimated_time_impact_days=body.estimated_time_impact_days,
        note="Initial estimate", created_by=user.id))
    db.add(co)
    db.flush()
    log_event(db, co, user, "Created")
    if body.submit:
        log_event(db, co, user, "Submitted for client review")
        notify_clients(db, project, user,
                       f"Change order awaiting your review: {co.co_number}",
                       f"{co.title} — est. ₹{body.estimated_cost:,.0f}, +{body.estimated_time_impact_days} days ({project.name})")
    db.commit()
    db.refresh(co)
    users, phases = _maps(db, project_id)
    return co_out(co, users, phases)


@router.post("/change-orders/{co_id}/approve")
def approve_co(co_id: int, body: COAction, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    co = get_co_or_404(db, co_id)
    project = db.get(Project, co.project_id)
    check_co_access(user, project)
    if user.role not in ("Client", "Admin"):
        raise HTTPException(status_code=403, detail="Only the client (or Admin) can approve")
    if not body.confirm:
        raise HTTPException(status_code=422, detail="Explicit approval confirmation required (confirm=true)")
    if co.status not in ("Pending Client Review", "Revision Requested"):
        raise HTTPException(status_code=422, detail=f"Cannot approve from status '{co.status}'")
    co.status = "Approved"
    co.approved_cost = co.estimated_cost
    co.approval_date = datetime.now(timezone.utc)
    co.approved_by = user.id
    log_event(db, co, user, "Approved", body.comment)
    notify_team(db, project, user, f"Change order APPROVED: {co.co_number}",
                f"{user.name} approved '{co.title}' at ₹{f(co.approved_cost):,.0f} ({project.name})")
    db.commit()
    db.refresh(co)
    users, phases = _maps(db, co.project_id)
    return co_out(co, users, phases)


@router.post("/change-orders/{co_id}/reject")
def reject_co(co_id: int, body: COAction, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    co = get_co_or_404(db, co_id)
    project = db.get(Project, co.project_id)
    check_co_access(user, project)
    if user.role not in ("Client", "Admin"):
        raise HTTPException(status_code=403, detail="Only the client (or Admin) can reject")
    if co.status not in ("Pending Client Review", "Revision Requested"):
        raise HTTPException(status_code=422, detail=f"Cannot reject from status '{co.status}'")
    co.status = "Rejected"
    log_event(db, co, user, "Rejected", body.comment)
    notify_team(db, project, user, f"Change order rejected: {co.co_number}",
                f"{user.name} rejected '{co.title}'" + (f": {body.comment}" if body.comment else ""))
    db.commit()
    db.refresh(co)
    users, phases = _maps(db, co.project_id)
    return co_out(co, users, phases)


@router.post("/change-orders/{co_id}/request-revision")
def request_revision(co_id: int, body: COAction, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    co = get_co_or_404(db, co_id)
    project = db.get(Project, co.project_id)
    check_co_access(user, project)
    if user.role not in ("Client", "Admin"):
        raise HTTPException(status_code=403, detail="Only the client (or Admin) can request revision")
    if not (body.comment or "").strip():
        raise HTTPException(status_code=422, detail="A comment is required when requesting a revision")
    if co.status != "Pending Client Review":
        raise HTTPException(status_code=422, detail=f"Cannot request revision from status '{co.status}'")
    co.status = "Revision Requested"
    log_event(db, co, user, "Revision requested", body.comment)
    notify_team(db, project, user, f"Revision requested: {co.co_number}",
                f"{user.name} on '{co.title}': {body.comment}")
    db.commit()
    db.refresh(co)
    users, phases = _maps(db, co.project_id)
    return co_out(co, users, phases)


@router.post("/change-orders/{co_id}/revise")
def revise_co(co_id: int, body: CORevise, db: Session = Depends(get_db),
              user: User = Depends(CONTRACTOR)):
    co = get_co_or_404(db, co_id)
    project = db.get(Project, co.project_id)
    if co.status not in ("Revision Requested", "Rejected", "Draft", "Pending Client Review"):
        raise HTTPException(status_code=422, detail=f"Cannot revise an {co.status} change order")
    version = len(co.revisions) + 1
    co.revisions.append(ProjectChangeOrderRevision(
        version=version, estimated_cost=body.estimated_cost,
        estimated_time_impact_days=body.estimated_time_impact_days,
        note=body.note, created_by=user.id))
    co.estimated_cost = body.estimated_cost
    co.estimated_time_impact_days = body.estimated_time_impact_days
    co.status = "Pending Client Review"
    log_event(db, co, user, f"Revised estimate (v{version})", body.note)
    notify_clients(db, project, user, f"Revised estimate for {co.co_number}",
                   f"'{co.title}' v{version}: ₹{body.estimated_cost:,.0f}, +{body.estimated_time_impact_days} days ({project.name})")
    db.commit()
    db.refresh(co)
    users, phases = _maps(db, co.project_id)
    return co_out(co, users, phases)
