from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Client, Project, Phase, ProgressUpdate
from app.schemas import (ProjectCreate, ProjectUpdate, PhaseCreate, PhaseUpdate,
                         ProgressUpdateCreate)
from app.core.security import get_current_user, require_roles
from app.crud import project_out, phase_out, update_out
from datetime import date

router = APIRouter(tags=["projects"])


def get_project_or_404(db: Session, project_id: int, include_archived=False) -> Project:
    project = db.get(Project, project_id)
    if not project or (project.is_archived and not include_archived):
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def check_write_access(user: User, project: Project):
    if user.role == "Admin":
        return
    if user.role == "SiteEngineer" and project.site_engineer_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Not authorized to modify this project")


def check_read_access(user: User, project: Project):
    if user.role == "Client" and user.client_id != project.client_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this project")


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("Admin"))):
    if not db.get(Client, body.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    project = Project(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project_out(db, project)


@router.get("/projects")
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                  client_id: int = None, status: str = None, site_engineer_id: int = None,
                  search: str = None,
                  limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    q = db.query(Project).filter(Project.is_archived == False)  # noqa: E712
    if user.role == "Client":
        q = q.filter(Project.client_id == user.client_id)
    if client_id is not None:
        q = q.filter(Project.client_id == client_id)
    if status:
        q = q.filter(Project.status == status)
    if site_engineer_id is not None:
        q = q.filter(Project.site_engineer_id == site_engineer_id)
    if search:
        q = q.filter(or_(Project.name.ilike(f"%{search}%"), Project.location.ilike(f"%{search}%")))
    total = q.count()
    items = q.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [project_out(db, p) for p in items],
            "total": total, "limit": limit, "offset": offset}


@router.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_read_access(user, project)
    return project_out(db, project, detail=True)


@router.put("/projects/{project_id}")
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_write_access(user, project)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return project_out(db, project)


@router.delete("/projects/{project_id}", status_code=204)
def archive_project(project_id: int, db: Session = Depends(get_db),
                    user: User = Depends(require_roles("Admin"))):
    project = get_project_or_404(db, project_id)
    project.is_archived = True
    db.commit()


@router.post("/projects/{project_id}/phases", status_code=201)
def add_phase(project_id: int, body: PhaseCreate, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_write_access(user, project)
    dup = db.query(Phase).filter(Phase.project_id == project_id,
                                 Phase.sequence_order == body.sequence_order).first()
    if dup:
        raise HTTPException(status_code=409, detail="sequence_order already used in this project")
    phase = Phase(project_id=project_id, **body.model_dump())
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase_out(phase)


@router.get("/projects/{project_id}/phases")
def list_phases(project_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_read_access(user, project)
    phases = (db.query(Phase).filter(Phase.project_id == project_id)
              .order_by(Phase.sequence_order.asc()).all())
    return [phase_out(p) for p in phases]


@router.put("/phases/{phase_id}")
def update_phase(phase_id: int, body: PhaseUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    phase = db.get(Phase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    check_write_access(user, phase.project)
    data = body.model_dump(exclude_unset=True)
    if "sequence_order" in data and data["sequence_order"] != phase.sequence_order:
        dup = db.query(Phase).filter(Phase.project_id == phase.project_id,
                                     Phase.sequence_order == data["sequence_order"],
                                     Phase.id != phase.id).first()
        if dup:
            raise HTTPException(status_code=409, detail="sequence_order already used in this project")
    for k, v in data.items():
        setattr(phase, k, v)
    db.commit()
    db.refresh(phase)
    return phase_out(phase)


@router.delete("/phases/{phase_id}", status_code=204)
def delete_phase(phase_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    phase = db.get(Phase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    check_write_access(user, phase.project)
    db.delete(phase)
    db.commit()


@router.post("/projects/{project_id}/updates", status_code=201)
def post_update(project_id: int, body: ProgressUpdateCreate, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_write_access(user, project)
    if body.phase_id is not None:
        phase = db.get(Phase, body.phase_id)
        if not phase or phase.project_id != project_id:
            raise HTTPException(status_code=422, detail="phase_id does not belong to this project")
    upd = ProgressUpdate(project_id=project_id, updated_by=user.id,
                         update_date=body.update_date or date.today(),
                         **body.model_dump(exclude={"update_date"}))
    db.add(upd)
    if body.phase_id is not None and body.percent_progress is not None:
        phase = db.get(Phase, body.phase_id)
        phase.percent_complete = body.percent_progress
        if phase.status == "NotStarted" and body.percent_progress > 0:
            phase.status = "InProgress"
        if body.percent_progress == 100:
            phase.status = "Completed"
    db.commit()
    db.refresh(upd)
    return update_out(upd)


@router.get("/projects/{project_id}/updates")
def list_updates(project_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user),
                 limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    project = get_project_or_404(db, project_id)
    check_read_access(user, project)
    q = db.query(ProgressUpdate).filter(ProgressUpdate.project_id == project_id)
    if user.role == "Client":
        q = q.filter(ProgressUpdate.visible_to_client == True)  # noqa: E712
    total = q.count()
    items = (q.order_by(ProgressUpdate.update_date.desc(), ProgressUpdate.created_at.desc())
             .offset(offset).limit(limit).all())
    return {"items": [update_out(u) for u in items],
            "total": total, "limit": limit, "offset": offset}
