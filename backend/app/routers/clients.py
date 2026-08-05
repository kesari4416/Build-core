from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Client, Project, ProgressUpdate
from app.core.security import get_current_user, require_roles
from app.crud import project_out, update_out, client_out

router = APIRouter(tags=["clients"])


def check_client_access(user: User, client_id: int):
    if user.role == "Client" and user.client_id != client_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this client")


@router.get("/clients")
def list_clients(db: Session = Depends(get_db),
                 user: User = Depends(require_roles("Admin", "SiteEngineer"))):
    clients = db.query(Client).order_by(Client.name).all()
    result = []
    for c in clients:
        count = db.query(Project).filter(Project.client_id == c.id,
                                         Project.is_archived == False).count()  # noqa: E712
        result.append(client_out(c, count))
    return result


@router.get("/clients/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    check_client_access(user, client_id)
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client_out(client)


@router.get("/clients/{client_id}/projects")
def client_projects(client_id: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    check_client_access(user, client_id)
    if not db.get(Client, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    projects = (db.query(Project).filter(Project.client_id == client_id,
                                         Project.is_archived == False)  # noqa: E712
                .order_by(Project.created_at.desc()).all())
    return [project_out(db, p) for p in projects]


@router.get("/clients/{client_id}/projects/{project_id}/updates")
def client_project_updates(client_id: int, project_id: int, db: Session = Depends(get_db),
                           user: User = Depends(get_current_user),
                           limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    check_client_access(user, client_id)
    project = db.get(Project, project_id)
    if not project or project.is_archived or project.client_id != client_id:
        raise HTTPException(status_code=404, detail="Project not found for this client")
    q = db.query(ProgressUpdate).filter(ProgressUpdate.project_id == project_id,
                                        ProgressUpdate.visible_to_client == True)  # noqa: E712
    total = q.count()
    items = (q.order_by(ProgressUpdate.update_date.desc(), ProgressUpdate.created_at.desc())
             .offset(offset).limit(limit).all())
    return {"items": [update_out(u) for u in items],
            "total": total, "limit": limit, "offset": offset}


@router.get("/users")
def list_users(db: Session = Depends(get_db), role: str = None,
               user: User = Depends(require_roles("Admin", "SiteEngineer"))):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in q.all()]


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Project).filter(Project.is_archived == False)  # noqa: E712
    if user.role == "Client":
        q = q.filter(Project.client_id == user.client_id)
    projects = q.all()
    by_status = {}
    issues = 0
    total_budget = 0.0
    for p in projects:
        by_status[p.status] = by_status.get(p.status, 0) + 1
        from app.crud import has_active_issues
        if has_active_issues(db, p.id):
            issues += 1
        if p.budget:
            total_budget += float(p.budget)
    return {"total_projects": len(projects), "by_status": by_status,
            "projects_with_issues": issues, "total_budget": total_budget}
