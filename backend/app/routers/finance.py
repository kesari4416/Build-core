from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Project, Client
from app.models.finance import Invoice, Payment, PayrollRun, PayrollEntry, ExpenseEntry
from app.models.procurement import PurchaseOrder, Subcontract
from app.core.security import get_current_user, require_roles
from app.crud.procurement import committed_amount, f, d
from app.routers.projects import get_project_or_404

router = APIRouter(tags=["finance"])
FIN = require_roles("Admin", "Accountant")
STAFF = require_roles("Admin", "Accountant", "SiteEngineer", "ProcurementOfficer")


class InvoiceCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    tax_amount: Decimal = 0
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: Literal["Draft", "Sent", "Cancelled"] = "Sent"


class InvoicePatch(BaseModel):
    amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[Literal["Draft", "Sent", "Partial", "Paid", "Overdue", "Cancelled"]] = None


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_date: Optional[date] = None
    payment_method: Literal["BankTransfer", "Cheque", "Cash", "UPI", "Other"] = "BankTransfer"
    reference_no: Optional[str] = None
    notes: Optional[str] = None


class PayrollRunCreate(BaseModel):
    period_start: date
    period_end: date


class ExpenseCreate(BaseModel):
    category: str = "Misc"
    amount: Decimal = Field(gt=0)
    expense_date: Optional[date] = None
    description: Optional[str] = None
    receipt_file_url: Optional[str] = None


class ExpensePatch(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    expense_date: Optional[date] = None
    description: Optional[str] = None


def paid_sum(db, invoice_id):
    return f(db.query(func.coalesce(func.sum(Payment.amount), 0))
             .filter(Payment.invoice_id == invoice_id).scalar())


def refresh_invoice_status(db, inv):
    if inv.status in ("Draft", "Cancelled"):
        return inv.status
    paid = paid_sum(db, inv.id)
    total = f(inv.amount) + f(inv.tax_amount)
    if paid >= total > 0:
        inv.status = "Paid"
    elif inv.due_date and inv.due_date < date.today():
        inv.status = "Overdue"
    elif paid > 0:
        inv.status = "Partial"
    else:
        inv.status = "Sent"
    return inv.status


def invoice_out(db, inv):
    paid = paid_sum(db, inv.id)
    refresh_invoice_status(db, inv)
    db.commit()
    return {"id": inv.id, "project_id": inv.project_id, "client_id": inv.client_id,
            "invoice_number": inv.invoice_number, "amount": f(inv.amount),
            "tax_amount": f(inv.tax_amount), "total": f(inv.amount) + f(inv.tax_amount),
            "paid_amount": paid, "balance_due": round(f(inv.amount) + f(inv.tax_amount) - paid, 2),
            "issue_date": d(inv.issue_date), "due_date": d(inv.due_date),
            "status": inv.status, "description": inv.description, "created_at": d(inv.created_at)}


def payment_out(p):
    return {"id": p.id, "invoice_id": p.invoice_id, "project_id": p.project_id,
            "client_id": p.client_id, "amount": f(p.amount), "payment_date": d(p.payment_date),
            "payment_method": p.payment_method, "reference_no": p.reference_no,
            "notes": p.notes, "created_at": d(p.created_at)}


def entry_out(e):
    return {"id": e.id, "payroll_run_id": e.payroll_run_id, "user_id": e.user_id,
            "staff_name": e.staff.name if e.staff else None, "project_id": e.project_id,
            "role_at_time": e.role_at_time, "base_salary": f(e.base_salary),
            "overtime_amount": f(e.overtime_amount), "deductions": f(e.deductions),
            "bonuses": f(e.bonuses), "net_pay": f(e.net_pay),
            "payment_status": e.payment_status, "paid_at": d(e.paid_at)}


def run_out(db, r):
    entries = db.query(PayrollEntry).filter_by(payroll_run_id=r.id).all()
    return {"id": r.id, "period_start": d(r.period_start), "period_end": d(r.period_end),
            "status": r.status, "entry_count": len(entries),
            "total_net_pay": round(sum(f(e.net_pay) for e in entries), 2),
            "created_at": d(r.created_at)}


def expense_out(e):
    return {"id": e.id, "project_id": e.project_id, "category": e.category,
            "amount": f(e.amount), "expense_date": d(e.expense_date),
            "description": e.description, "receipt_file_url": e.receipt_file_url}


def project_finance(db, project):
    income = f(db.query(func.coalesce(func.sum(Payment.amount), 0))
               .filter(Payment.project_id == project.id).scalar())
    pos = db.query(PurchaseOrder).filter_by(project_id=project.id).all()
    subs = db.query(Subcontract).filter_by(project_id=project.id).all()
    committed = sum(committed_amount(db, "po", p) for p in pos if p.status != "Cancelled") + \
        sum(committed_amount(db, "subcontract", s) for s in subs if s.status not in ("Cancelled", "Terminated"))
    payroll = f(db.query(func.coalesce(func.sum(PayrollEntry.net_pay), 0))
                .filter(PayrollEntry.project_id == project.id).scalar())
    expenses = f(db.query(func.coalesce(func.sum(ExpenseEntry.amount), 0))
                 .filter(ExpenseEntry.project_id == project.id).scalar())
    invoices = db.query(Invoice).filter(Invoice.project_id == project.id,
                                        Invoice.status.notin_(["Draft", "Cancelled"])).all()
    outstanding = sum(max(0, f(i.amount) + f(i.tax_amount) - paid_sum(db, i.id)) for i in invoices)
    cost = committed + payroll + expenses
    cutoff = date.today() - timedelta(days=365)
    revenue_1y = f(db.query(func.coalesce(func.sum(Payment.amount), 0))
                   .filter(Payment.project_id == project.id,
                           Payment.payment_date >= cutoff).scalar())
    expenses_1y = f(db.query(func.coalesce(func.sum(ExpenseEntry.amount), 0))
                    .filter(ExpenseEntry.project_id == project.id,
                            ExpenseEntry.expense_date >= cutoff).scalar())
    cost_1y = committed + payroll + expenses_1y
    profit_1y = revenue_1y - cost_1y
    return {"income_to_date": round(income, 2), "cost_to_date": round(cost, 2),
            "committed_procurement": round(committed, 2), "payroll_allocated": round(payroll, 2),
            "expenses_total": round(expenses, 2), "profit": round(income - cost, 2),
            "outstanding_invoices": round(outstanding, 2),
            "period_from": cutoff.isoformat(), "period_to": date.today().isoformat(),
            "revenue_last_year": round(revenue_1y, 2), "cost_last_year": round(cost_1y, 2),
            "profit_last_year": round(profit_1y, 2)}


@router.get("/expense-categories")
def list_expense_categories(db: Session = Depends(get_db), user: User = Depends(STAFF)):
    from app.models.finance import ExpenseCategory
    return [{"id": c.id, "name": c.name} for c in
            db.query(ExpenseCategory).order_by(ExpenseCategory.name).all()]


@router.post("/expense-categories", status_code=201)
def create_expense_category(body: dict, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    from app.models.finance import ExpenseCategory
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    if db.query(ExpenseCategory).filter(ExpenseCategory.name.ilike(name)).first():
        raise HTTPException(status_code=409, detail=f"Category '{name}' already exists")
    c = ExpenseCategory(name=name, created_by=user.id)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name}


@router.patch("/expense-categories/{category_id}")
def rename_expense_category(category_id: int, body: dict, db: Session = Depends(get_db),
                            user: User = Depends(STAFF)):
    from app.models.finance import ExpenseCategory
    c = db.get(ExpenseCategory, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    old = c.name
    c.name = name
    db.query(ExpenseEntry).filter(ExpenseEntry.category == old).update({"category": name})
    db.commit()
    return {"id": c.id, "name": c.name}


@router.delete("/expense-categories/{category_id}", status_code=204)
def delete_expense_category(category_id: int, db: Session = Depends(get_db),
                            user: User = Depends(STAFF)):
    from app.models.finance import ExpenseCategory
    c = db.get(ExpenseCategory, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(c); db.commit()


@router.get("/geo/reverse")
def reverse_geocode(lat: float, lon: float, user: User = Depends(STAFF)):
    import requests as rq
    try:
        r = rq.get("https://nominatim.openstreetmap.org/reverse",
                   params={"format": "json", "lat": lat, "lon": lon, "zoom": 14},
                   headers={"User-Agent": "BuildCore-Portal/1.0"}, timeout=8)
        data = r.json()
        a = data.get("address", {})
        parts = [a.get("suburb") or a.get("neighbourhood") or a.get("village"),
                 a.get("city") or a.get("town") or a.get("county"), a.get("state")]
        label = ", ".join([p for p in parts if p]) or data.get("display_name") or f"{lat:.4f}, {lon:.4f}"
    except Exception:
        label = f"{lat:.4f}, {lon:.4f}"
    return {"location": label}


@router.get("/projects/{project_id}/ledger")
def project_ledger(project_id: int, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    entries = []
    for p in db.query(Payment).filter(Payment.project_id == project_id).all():
        inv = db.get(Invoice, p.invoice_id) if p.invoice_id else None
        entries.append({"date": d(p.payment_date), "type": "credit",
                        "description": f"Client payment{' — ' + inv.invoice_number if inv else ''}"
                                       f" ({p.payment_method or 'BankTransfer'})",
                        "amount": f(p.amount)})
    for e in db.query(ExpenseEntry).filter(ExpenseEntry.project_id == project_id).all():
        entries.append({"date": d(e.expense_date), "type": "debit",
                        "description": f"Expense — {e.category}" + (f": {e.description}" if e.description else ""),
                        "amount": f(e.amount)})
    for pe, run in (db.query(PayrollEntry, PayrollRun)
                    .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
                    .filter(PayrollEntry.project_id == project_id).all()):
        entries.append({"date": d(run.period_end), "type": "debit",
                        "description": f"Payroll — period {d(run.period_start)} → {d(run.period_end)}",
                        "amount": f(pe.net_pay)})
    entries.sort(key=lambda x: x["date"] or "", reverse=True)
    total_credit = round(sum(x["amount"] for x in entries if x["type"] == "credit"), 2)
    total_debit = round(sum(x["amount"] for x in entries if x["type"] == "debit"), 2)
    return {"project_id": project_id, "entries": entries, "total_credit": total_credit,
            "total_debit": total_debit, "net": round(total_credit - total_debit, 2)}


@router.post("/projects/{project_id}/invoices", status_code=201)
def create_invoice(project_id: int, body: InvoiceCreate, db: Session = Depends(get_db),
                   user: User = Depends(FIN)):
    project = get_project_or_404(db, project_id)
    count = db.query(Invoice).filter_by(project_id=project_id).count()
    inv = Invoice(project_id=project_id, client_id=project.client_id,
                  invoice_number=f"INV-{project_id}-{count + 1:03d}", created_by=user.id,
                  **body.model_dump())
    db.add(inv); db.commit(); db.refresh(inv)
    return invoice_out(db, inv)


@router.get("/projects/{project_id}/invoices")
def list_invoices(project_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    if user.role == "Client" and user.client_id != project.client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    invs = db.query(Invoice).filter_by(project_id=project_id).order_by(Invoice.created_at.desc()).all()
    return [invoice_out(db, i) for i in invs]


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if user.role == "Client" and user.client_id != inv.client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    out = invoice_out(db, inv)
    out["payments"] = [payment_out(p) for p in inv.payments]
    return out


@router.patch("/invoices/{invoice_id}")
def patch_invoice(invoice_id: int, body: InvoicePatch, db: Session = Depends(get_db),
                  user: User = Depends(FIN)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(inv, k, v)
    db.commit(); db.refresh(inv)
    return invoice_out(db, inv)


@router.post("/invoices/{invoice_id}/payments", status_code=201)
def record_payment(invoice_id: int, body: PaymentCreate, db: Session = Depends(get_db),
                   user: User = Depends(FIN)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    p = Payment(invoice_id=invoice_id, project_id=inv.project_id, client_id=inv.client_id,
                received_by=user.id, payment_date=body.payment_date or date.today(),
                **body.model_dump(exclude={"payment_date"}))
    db.add(p); db.commit()
    refresh_invoice_status(db, inv)
    db.commit(); db.refresh(p)
    return payment_out(p)


@router.get("/invoices/{invoice_id}/payments")
def invoice_payments(invoice_id: int, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if user.role == "Client" and user.client_id != inv.client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return [payment_out(p) for p in inv.payments]


@router.post("/projects/{project_id}/payments", status_code=201)
def project_payment(project_id: int, body: PaymentCreate, db: Session = Depends(get_db),
                    user: User = Depends(FIN)):
    project = get_project_or_404(db, project_id)
    p = Payment(project_id=project_id, client_id=project.client_id, received_by=user.id,
                payment_date=body.payment_date or date.today(),
                **body.model_dump(exclude={"payment_date"}))
    db.add(p); db.commit(); db.refresh(p)
    return payment_out(p)


@router.get("/projects/{project_id}/payments")
def list_payments(project_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    project = get_project_or_404(db, project_id)
    if user.role == "Client" and user.client_id != project.client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    ps = db.query(Payment).filter_by(project_id=project_id).order_by(Payment.created_at.desc()).all()
    return [payment_out(p) for p in ps]


@router.get("/clients/{client_id}/invoices")
def client_invoices(client_id: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if user.role == "Client" and user.client_id != client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    invs = db.query(Invoice).filter_by(client_id=client_id).order_by(Invoice.created_at.desc()).all()
    return [invoice_out(db, i) for i in invs]


@router.post("/payroll-runs", status_code=201)
def create_run(body: PayrollRunCreate, db: Session = Depends(get_db), user: User = Depends(FIN)):
    r = PayrollRun(**body.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return run_out(db, r)


@router.get("/payroll-runs")
def list_runs(db: Session = Depends(get_db), user: User = Depends(FIN)):
    return [run_out(db, r) for r in db.query(PayrollRun).order_by(PayrollRun.created_at.desc()).all()]


@router.post("/payroll-runs/{run_id}/process")
def process_run(run_id: int, db: Session = Depends(get_db), user: User = Depends(FIN)):
    r = db.get(PayrollRun, run_id)
    if not r:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if r.status != "Draft":
        raise HTTPException(status_code=409, detail="Run already processed")
    staff = db.query(User).filter(User.role.in_(["Admin", "SiteEngineer", "Accountant", "ProcurementOfficer"]),
                                  User.status != "Disabled").all()
    for u in staff:
        base = f(getattr(u, "base_salary", 0) or 0)
        db.add(PayrollEntry(payroll_run_id=run_id, user_id=u.id, role_at_time=u.role,
                            base_salary=base, net_pay=base))
    r.status = "Processed"
    r.processed_by = user.id
    db.commit(); db.refresh(r)
    return run_out(db, r)


@router.get("/payroll-runs/{run_id}/entries")
def run_entries(run_id: int, db: Session = Depends(get_db), user: User = Depends(FIN)):
    return [entry_out(e) for e in db.query(PayrollEntry).filter_by(payroll_run_id=run_id).all()]


@router.post("/payroll-entries/{entry_id}/mark-paid")
def mark_entry_paid(entry_id: int, db: Session = Depends(get_db), user: User = Depends(FIN)):
    from datetime import datetime, timezone
    e = db.get(PayrollEntry, entry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    e.payment_status = "Paid"
    e.paid_at = datetime.now(timezone.utc)
    r = db.get(PayrollRun, e.payroll_run_id)
    db.commit()
    if all(x.payment_status == "Paid" for x in db.query(PayrollEntry).filter_by(payroll_run_id=r.id).all()):
        r.status = "Paid"
        db.commit()
    return entry_out(e)


@router.post("/projects/{project_id}/expenses", status_code=201)
def add_expense(project_id: int, body: ExpenseCreate, db: Session = Depends(get_db),
                user: User = Depends(STAFF)):
    get_project_or_404(db, project_id)
    e = ExpenseEntry(project_id=project_id, recorded_by=user.id,
                     expense_date=body.expense_date or date.today(),
                     **body.model_dump(exclude={"expense_date"}))
    db.add(e); db.commit(); db.refresh(e)
    return expense_out(e)


@router.get("/projects/{project_id}/expenses")
def list_expenses(project_id: int, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    es = db.query(ExpenseEntry).filter_by(project_id=project_id).order_by(ExpenseEntry.created_at.desc()).all()
    return [expense_out(e) for e in es]


@router.patch("/expenses/{expense_id}")
def patch_expense(expense_id: int, body: ExpensePatch, db: Session = Depends(get_db),
                  user: User = Depends(STAFF)):
    e = db.get(ExpenseEntry, expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit(); db.refresh(e)
    return expense_out(e)


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(FIN)):
    e = db.get(ExpenseEntry, expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(e); db.commit()


@router.get("/projects/{project_id}/finance/summary")
def finance_summary(project_id: int, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    return project_finance(db, get_project_or_404(db, project_id))


@router.get("/finance/dashboard-summary")
def org_summary(db: Session = Depends(get_db), user: User = Depends(FIN)):
    projects = db.query(Project).filter(Project.is_archived == False).all()  # noqa: E712
    totals = {"income_to_date": 0, "cost_to_date": 0, "committed_procurement": 0,
              "payroll_allocated": 0, "expenses_total": 0, "profit": 0, "outstanding_invoices": 0}
    for p in projects:
        s = project_finance(db, p)
        for k in totals:
            totals[k] = round(totals[k] + s[k], 2)
    overdue = []
    for inv in db.query(Invoice).filter(Invoice.status.notin_(["Draft", "Cancelled", "Paid"])).all():
        if refresh_invoice_status(db, inv) == "Overdue":
            overdue.append(invoice_out(db, inv))
    db.commit()
    totals["overdue_invoices"] = overdue
    payroll_total = f(db.query(func.coalesce(func.sum(PayrollEntry.net_pay), 0)).scalar())
    totals["payroll_total_all"] = round(payroll_total, 2)
    return totals
