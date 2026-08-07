from sqlalchemy import (Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey)
from sqlalchemy.orm import relationship
from app.database import Base
from app.models import utcnow


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    invoice_number = Column(String, nullable=False)
    amount = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    issue_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String, default="Draft", nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    payments = relationship("Payment", backref="invoice")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String, default="BankTransfer")
    reference_no = Column(String)
    received_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class PayrollRun(Base):
    __tablename__ = "payroll_runs"
    id = Column(Integer, primary_key=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String, default="Draft", nullable=False)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    entries = relationship("PayrollEntry", cascade="all, delete-orphan")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"
    id = Column(Integer, primary_key=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    role_at_time = Column(String)
    base_salary = Column(Numeric(14, 2), default=0)
    overtime_amount = Column(Numeric(14, 2), default=0)
    deductions = Column(Numeric(14, 2), default=0)
    bonuses = Column(Numeric(14, 2), default=0)
    net_pay = Column(Numeric(14, 2), default=0)
    payment_status = Column(String, default="Pending")
    paid_at = Column(DateTime(timezone=True), nullable=True)
    staff = relationship("User", foreign_keys=[user_id])


class ExpenseEntry(Base):
    __tablename__ = "expense_entries"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    category = Column(String, default="Misc")
    amount = Column(Numeric(14, 2), nullable=False)
    expense_date = Column(Date, nullable=True)
    description = Column(Text)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    receipt_file_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    assigned_role = Column(String, default="SiteEngineer")
    created_at = Column(DateTime(timezone=True), default=utcnow)


class BidLineItem(Base):
    __tablename__ = "bid_line_items"
    id = Column(Integer, primary_key=True)
    bid_package_id = Column(Integer, ForeignKey("bid_packages.id"), nullable=False, index=True)
    item_description = Column(String, nullable=False)
    unit = Column(String)
    quantity_required = Column(Numeric(12, 2), default=0)
    cost_code = Column(String)


class BidLineItemQuote(Base):
    __tablename__ = "bid_line_item_quotes"
    id = Column(Integer, primary_key=True)
    bid_id = Column(Integer, ForeignKey("bids.id"), nullable=False, index=True)
    bid_line_item_id = Column(Integer, ForeignKey("bid_line_items.id"), nullable=False, index=True)
    quantity_offered = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(14, 2), default=0)
    line_total = Column(Numeric(14, 2), default=0)
    lead_time_days = Column(Integer, nullable=True)
    notes = Column(Text)
