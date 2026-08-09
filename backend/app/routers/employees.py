from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Project
from app.models.finance import Employee, Attendance
from app.core.security import require_roles

router = APIRouter(tags=["employees"])
INTERNAL = require_roles("Admin", "SiteEngineer", "Accountant", "ProcurementOfficer")

ATT_STATUSES = ("present", "absent", "half_day", "leave")
DAY_VALUE = {"present": 1.0, "half_day": 0.5}


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1)
    role_title: Optional[str] = None
    phone: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    daily_wage: Optional[Decimal] = None
    wage_type: Literal["daily", "monthly", "piece_rate"] = "daily"
    joining_date: Optional[date] = None


class EmployeePatch(BaseModel):
    name: Optional[str] = None
    role_title: Optional[str] = None
    phone: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    daily_wage: Optional[Decimal] = None
    wage_type: Optional[Literal["daily", "monthly", "piece_rate"]] = None
    joining_date: Optional[date] = None
    status: Optional[Literal["active", "inactive"]] = None


class AttendanceMark(BaseModel):
    employee_id: int
    attendance_date: Optional[date] = None
    status: Literal["present", "absent", "half_day", "leave"]
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None


class AttendancePatch(BaseModel):
    status: Optional[Literal["present", "absent", "half_day", "leave"]] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None


def d(v):
    return v.isoformat() if v else None


def employee_out(e: Employee) -> dict:
    return {"id": e.id, "project_id": e.project_id, "name": e.name, "role_title": e.role_title,
            "phone": e.phone, "id_proof_type": e.id_proof_type, "id_proof_number": e.id_proof_number,
            "daily_wage": float(e.daily_wage) if e.daily_wage is not None else None,
            "wage_type": e.wage_type, "joining_date": d(e.joining_date), "status": e.status,
            "created_at": d(e.created_at)}


def attendance_out(a: Attendance, employee_name: str = None) -> dict:
    return {"id": a.id, "employee_id": a.employee_id, "project_id": a.project_id,
            "employee_name": employee_name,
            "attendance_date": d(a.attendance_date), "status": a.status,
            "check_in_time": a.check_in_time, "check_out_time": a.check_out_time,
            "marked_by": a.marked_by, "marked_at": d(a.marked_at), "notes": a.notes}


def get_project_or_404(db: Session, project_id: int) -> Project:
    p = db.get(Project, project_id)
    if not p or p.is_archived:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def check_backdate_window(user: User, day: date):
    if user.role == "Admin":
        return
    today = date.today()
    if day > today:
        raise HTTPException(status_code=422, detail="Attendance cannot be marked for a future date")
    if day < today - timedelta(days=3):
        raise HTTPException(status_code=422,
                            detail="Attendance can only be marked for today or up to 3 days back")


# ---------- Employees ----------
@router.post("/projects/{project_id}/employees", status_code=201)
def create_employee(project_id: int, body: EmployeeCreate, db: Session = Depends(get_db),
                    user: User = Depends(INTERNAL)):
    get_project_or_404(db, project_id)
    e = Employee(project_id=project_id, created_by=user.id, **body.model_dump())
    db.add(e); db.commit(); db.refresh(e)
    return employee_out(e)


@router.get("/projects/{project_id}/employees")
def list_employees(project_id: int, db: Session = Depends(get_db), user: User = Depends(INTERNAL),
                   status: Optional[str] = None, search: Optional[str] = None):
    get_project_or_404(db, project_id)
    q = db.query(Employee).filter(Employee.project_id == project_id)
    if status:
        q = q.filter(Employee.status == status)
    if search:
        q = q.filter(Employee.name.ilike(f"%{search}%"))
    return [employee_out(e) for e in q.order_by(Employee.name).all()]


@router.get("/employees/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db), user: User = Depends(INTERNAL)):
    e = db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee_out(e)


@router.patch("/employees/{employee_id}")
def patch_employee(employee_id: int, body: EmployeePatch, db: Session = Depends(get_db),
                   user: User = Depends(INTERNAL)):
    e = db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit(); db.refresh(e)
    return employee_out(e)


@router.post("/employees/{employee_id}/deactivate")
def deactivate_employee(employee_id: int, db: Session = Depends(get_db),
                        user: User = Depends(INTERNAL)):
    e = db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    e.status = "inactive"
    db.commit(); db.refresh(e)
    return employee_out(e)


# ---------- Attendance ----------
@router.post("/projects/{project_id}/attendance", status_code=201)
def mark_attendance(project_id: int, body: AttendanceMark, db: Session = Depends(get_db),
                    user: User = Depends(INTERNAL)):
    get_project_or_404(db, project_id)
    e = db.get(Employee, body.employee_id)
    if not e or e.project_id != project_id:
        raise HTTPException(status_code=422, detail="Employee does not belong to this project")
    day = body.attendance_date or date.today()
    check_backdate_window(user, day)
    existing = db.query(Attendance).filter_by(employee_id=e.id, attendance_date=day).first()
    if existing:
        existing.status = body.status
        existing.check_in_time = body.check_in_time
        existing.check_out_time = body.check_out_time
        existing.notes = body.notes
        existing.marked_by = user.id
        db.commit(); db.refresh(existing)
        return attendance_out(existing, e.name)
    a = Attendance(employee_id=e.id, project_id=project_id, attendance_date=day,
                   status=body.status, check_in_time=body.check_in_time,
                   check_out_time=body.check_out_time, notes=body.notes, marked_by=user.id)
    db.add(a); db.commit(); db.refresh(a)
    return attendance_out(a, e.name)


@router.get("/projects/{project_id}/attendance")
def list_attendance(project_id: int, db: Session = Depends(get_db), user: User = Depends(INTERNAL),
                    date_from: Optional[date] = None, date_to: Optional[date] = None,
                    employee_id: Optional[int] = None, status: Optional[str] = None):
    get_project_or_404(db, project_id)
    q = (db.query(Attendance, Employee.name).join(Employee, Attendance.employee_id == Employee.id)
         .filter(Attendance.project_id == project_id))
    if date_from:
        q = q.filter(Attendance.attendance_date >= date_from)
    if date_to:
        q = q.filter(Attendance.attendance_date <= date_to)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if status:
        q = q.filter(Attendance.status == status)
    return [attendance_out(a, name) for a, name in
            q.order_by(Attendance.attendance_date.desc()).all()]


@router.patch("/attendance/{attendance_id}")
def patch_attendance(attendance_id: int, body: AttendancePatch, db: Session = Depends(get_db),
                     user: User = Depends(INTERNAL)):
    a = db.get(Attendance, attendance_id)
    if not a:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    check_backdate_window(user, a.attendance_date)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    a.marked_by = user.id
    db.commit(); db.refresh(a)
    e = db.get(Employee, a.employee_id)
    return attendance_out(a, e.name if e else None)


@router.get("/employees/{employee_id}/attendance")
def employee_attendance(employee_id: int, db: Session = Depends(get_db),
                        user: User = Depends(INTERNAL),
                        limit: int = Query(60, ge=1, le=366)):
    e = db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    rows = (db.query(Attendance).filter_by(employee_id=employee_id)
            .order_by(Attendance.attendance_date.desc()).limit(limit).all())
    return [attendance_out(a, e.name) for a in rows]


# ---------- Labour cost report ----------
@router.get("/projects/{project_id}/labour-cost")
def labour_cost(project_id: int, db: Session = Depends(get_db), user: User = Depends(INTERNAL),
                date_from: Optional[date] = None, date_to: Optional[date] = None):
    get_project_or_404(db, project_id)
    today = date.today()
    date_from = date_from or today.replace(day=1)
    date_to = date_to or today
    employees = db.query(Employee).filter(Employee.project_id == project_id).all()
    atts = (db.query(Attendance).filter(Attendance.project_id == project_id,
                                        Attendance.attendance_date >= date_from,
                                        Attendance.attendance_date <= date_to).all())
    days_by_emp = {}
    for a in atts:
        days_by_emp[a.employee_id] = days_by_emp.get(a.employee_id, 0.0) + DAY_VALUE.get(a.status, 0.0)
    rows = []
    total = 0.0
    for e in employees:
        days = round(days_by_emp.get(e.id, 0.0), 1)
        amount = None
        if e.wage_type == "daily" and e.daily_wage is not None:
            amount = round(days * float(e.daily_wage), 2)
            total += amount
        rows.append({"employee_id": e.id, "name": e.name, "role_title": e.role_title,
                     "status": e.status, "wage_type": e.wage_type,
                     "daily_wage": float(e.daily_wage) if e.daily_wage is not None else None,
                     "days_present": days, "amount": amount})
    return {"project_id": project_id, "date_from": d(date_from), "date_to": d(date_to),
            "rows": rows, "total_amount": round(total, 2)}
