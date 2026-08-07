from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Client, Project, Phase, ProgressUpdate, Milestone
from app.schemas import (ProjectCreate, ProjectUpdate, PhaseCreate, PhaseUpdate,
                         ProgressUpdateCreate, PhaseReorder, MilestoneCreate, MilestoneUpdate)
from app.core.security import get_current_user, require_roles
from app.crud import project_out, phase_out, update_out, milestone_out, has_active_issues
from datetime import date, datetime, timezone

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
                  search: str = None, has_issues: bool = None,
                  start_date: date = None, end_date: date = None,
                  limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    q = db.query(Project).filter(Project.is_archived == False)  # noqa: E712
    if user.role == "Client":
        q = q.filter(Project.client_id == user.client_id)
    if user.role == "SiteEngineer":
        from app.models.finance import ProjectAssignment
        assigned = [a.project_id for a in db.query(ProjectAssignment).filter_by(user_id=user.id).all()]
        q = q.filter(or_(Project.site_engineer_id == user.id, Project.id.in_(assigned or [0])))
    if client_id is not None:
        q = q.filter(Project.client_id == client_id)
    if status:
        q = q.filter(Project.status == status)
    if site_engineer_id is not None:
        q = q.filter(Project.site_engineer_id == site_engineer_id)
    if search:
        q = q.filter(or_(Project.name.ilike(f"%{search}%"), Project.location.ilike(f"%{search}%")))
    if start_date:
        q = q.filter(Project.start_date_planned >= start_date)
    if end_date:
        q = q.filter(Project.end_date_planned <= end_date)
    q = q.order_by(Project.created_at.desc())
    if has_issues is not None:
        matched = [p for p in q.all() if has_active_issues(db, p.id) == has_issues]
        total = len(matched)
        items = matched[offset:offset + limit]
    else:
        total = q.count()
        items = q.offset(offset).limit(limit).all()
    return {"items": [project_out(db, p) for p in items],
            "total": total, "limit": limit, "offset": offset}


@router.get("/projects/dashboard-summary")
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Project).filter(Project.is_archived == False)  # noqa: E712
    if user.role == "Client":
        q = q.filter(Project.client_id == user.client_id)
    projects = q.all()
    return {
        "total_projects": len(projects),
        "ongoing": sum(1 for p in projects if p.status == "Ongoing"),
        "with_issues": sum(1 for p in projects if has_active_issues(db, p.id)),
        "total_budget": float(sum(p.budget or 0 for p in projects)),
    }


@router.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_read_access(user, project)
    return project_out(db, project, detail=True)


@router.patch("/projects/{project_id}")
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


@router.post("/projects/{project_id}/archive")
def archive_project_post(project_id: int, db: Session = Depends(get_db),
                         user: User = Depends(require_roles("Admin"))):
    project = get_project_or_404(db, project_id)
    project.is_archived = True
    db.commit()
    db.refresh(project)
    return project_out(db, project)


@router.post("/projects/{project_id}/phases/reorder")
def reorder_phases(project_id: int, body: PhaseReorder, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    check_write_access(user, project)
    phases = {p.id: p for p in project.phases}
    if set(body.phase_ids) != set(phases.keys()):
        raise HTTPException(status_code=422, detail="phase_ids must include every phase of this project exactly once")
    for i, pid in enumerate(body.phase_ids):
        phases[pid].sequence_order = 1000 + i
    db.flush()
    for i, pid in enumerate(body.phase_ids):
        phases[pid].sequence_order = i + 1
    db.commit()
    return [phase_out(phases[pid]) for pid in body.phase_ids]


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


@router.patch("/phases/{phase_id}")
@router.put("/phases/{phase_id}")
def update_phase(phase_id: int, body: PhaseUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    phase = db.get(Phase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    check_write_access(user, phase.project)
    data = body.model_dump(exclude_unset=True)
    old_status = phase.status
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
    if phase.status in ("Blocked", "Delayed") and phase.status != old_status:
        from app.routers.notifications import notify_flag
        notify_flag(db, phase.project, user, f"Phase{phase.status}",
                    f"Phase {phase.status}: {phase.name}",
                    f"{user.name} set phase '{phase.name}' to {phase.status} on {phase.project.name}.",
                    phase_id=phase.id)
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
    if upd.status_flag in ("Blocked", "Delayed"):
        from app.routers.notifications import notify_flag
        phase_name = None
        if upd.phase_id:
            ph = db.get(Phase, upd.phase_id)
            phase_name = ph.name if ph else None
        where = f" ({phase_name})" if phase_name else ""
        notify_flag(db, project, user, f"Update{upd.status_flag}",
                    f"{upd.status_flag} update on {project.name}",
                    f"{user.name} flagged progress as {upd.status_flag}{where}: {(upd.description or '')[:120]}",
                    phase_id=upd.phase_id)
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


@router.delete("/updates/{update_id}", status_code=204)
def delete_update(update_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    upd = db.get(ProgressUpdate, update_id)
    if not upd:
        raise HTTPException(status_code=404, detail="Update not found")
    check_write_access(user, upd.project)
    db.delete(upd)
    db.commit()


@router.get("/phases/{phase_id}/milestones")
def list_milestones(phase_id: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    phase = db.get(Phase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    check_read_access(user, phase.project)
    ms = (db.query(Milestone).filter(Milestone.phase_id == phase_id)
          .order_by(Milestone.sequence_order.asc()).all())
    return [milestone_out(m) for m in ms]


@router.post("/phases/{phase_id}/milestones", status_code=201)
def add_milestone(phase_id: int, body: MilestoneCreate, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    phase = db.get(Phase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    check_write_access(user, phase.project)
    m = Milestone(phase_id=phase_id, **body.model_dump())
    if m.status == "Done":
        m.completed_at = datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    db.refresh(m)
    return milestone_out(m)


@router.patch("/milestones/{milestone_id}")
def update_milestone(milestone_id: int, body: MilestoneUpdate, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    m = db.get(Milestone, milestone_id)
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    check_write_access(user, m.phase.project)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(m, k, v)
    if "status" in data:
        m.completed_at = datetime.now(timezone.utc) if data["status"] == "Done" else None
    db.commit()
    db.refresh(m)
    return milestone_out(m)
