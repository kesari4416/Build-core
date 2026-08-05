from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Text, Date, DateTime, Boolean,
                        Numeric, ForeignKey, JSON, UniqueConstraint)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="Client")
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    company = Column(String)
    email = Column(String)
    phone = Column(String)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    projects = relationship("Project", back_populates="client")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    site_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    location = Column(String)
    budget = Column(Numeric(14, 2))
    start_date_planned = Column(Date)
    end_date_planned = Column(Date)
    start_date_actual = Column(Date, nullable=True)
    end_date_actual = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="Planning")
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    client = relationship("Client", back_populates="projects")
    site_engineer = relationship("User", foreign_keys=[site_engineer_id])
    phases = relationship("Phase", back_populates="project", cascade="all, delete-orphan",
                          order_by="Phase.sequence_order")
    updates = relationship("ProgressUpdate", back_populates="project", cascade="all, delete-orphan")


class Phase(Base):
    __tablename__ = "phases"
    __table_args__ = (UniqueConstraint("project_id", "sequence_order", name="uq_phase_sequence"),)
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    sequence_order = Column(Integer, nullable=False)
    planned_start = Column(Date)
    planned_end = Column(Date)
    actual_start = Column(Date, nullable=True)
    actual_end = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="NotStarted")
    percent_complete = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project = relationship("Project", back_populates="phases")


class ProgressUpdate(Base):
    __tablename__ = "progress_updates"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"), nullable=True, index=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    update_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    percent_progress = Column(Integer, nullable=True)
    status_flag = Column(String, nullable=False, default="OnTrack")
    attachments = Column(JSON, default=list)
    visible_to_client = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="updates")
    phase = relationship("Phase")
    author = relationship("User", foreign_keys=[updated_by])
