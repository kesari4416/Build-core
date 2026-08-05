import os
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import User, Client, Project, Phase, ProgressUpdate
from app.core.security import hash_password, verify_password

PHOTO_1 = "https://images.unsplash.com/photo-1609867271967-a82f85c48531?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
PHOTO_2 = "https://images.pexels.com/photos/11827689/pexels-photo-11827689.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"


def seed_admin(db: Session):
    email = os.environ.get("ADMIN_EMAIL", "kesari4416@gmail.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = db.query(User).filter(User.email == email).first()
    if existing is None:
        db.add(User(email=email, password_hash=hash_password(password), name="Kesari", role="Admin"))
        db.commit()
    elif not verify_password(password, existing.password_hash):
        existing.password_hash = hash_password(password)
        db.commit()


def seed_demo_data(db: Session):
    if db.query(Client).count() > 0:
        return
    today = date.today()

    c1 = Client(name="Skyline Developers", company="Skyline Developers Pvt Ltd",
                email="contact@skylinedev.com", phone="+91 98200 11223")
    c2 = Client(name="GreenField Estates", company="GreenField Estates LLP",
                email="info@greenfield.com", phone="+91 99870 44556")
    c3 = Client(name="Metro Infra Group", company="Metro Infra Group Ltd",
                email="office@metroinfra.com", phone="+91 98111 77889")
    db.add_all([c1, c2, c3])
    db.flush()

    eng1 = User(email="raj@buildcore.com", password_hash=hash_password("engineer123"),
                name="Raj Verma", role="SiteEngineer")
    eng2 = User(email="neha@buildcore.com", password_hash=hash_password("engineer123"),
                name="Neha Patil", role="SiteEngineer")
    cl1 = User(email="priya@skyline.com", password_hash=hash_password("client123"),
               name="Priya Sharma", role="Client", client_id=c1.id)
    cl2 = User(email="arun@greenfield.com", password_hash=hash_password("client123"),
               name="Arun Mehta", role="Client", client_id=c2.id)
    cl3 = User(email="sara@metroinfra.com", password_hash=hash_password("client123"),
               name="Sara Khan", role="Client", client_id=c3.id)
    db.add_all([eng1, eng2, cl1, cl2, cl3])
    db.flush()

    admin = db.query(User).filter(User.role == "Admin").first()

    p1 = Project(name="Skyline Tower A", client_id=c1.id, site_engineer_id=eng1.id,
                 location="Andheri East, Mumbai", budget=250000000, status="Ongoing",
                 start_date_planned=today - timedelta(days=180),
                 end_date_planned=today + timedelta(days=360),
                 start_date_actual=today - timedelta(days=172))
    p2 = Project(name="Skyline Mall Extension", client_id=c1.id, site_engineer_id=eng2.id,
                 location="Powai, Mumbai", budget=120000000, status="Planning",
                 start_date_planned=today + timedelta(days=45),
                 end_date_planned=today + timedelta(days=500))
    p3 = Project(name="GreenField Villas Phase 1", client_id=c2.id, site_engineer_id=eng1.id,
                 location="Whitefield, Bengaluru", budget=85000000, status="Ongoing",
                 start_date_planned=today - timedelta(days=120),
                 end_date_planned=today + timedelta(days=240),
                 start_date_actual=today - timedelta(days=118))
    p4 = Project(name="GreenField Clubhouse", client_id=c2.id, site_engineer_id=eng2.id,
                 location="Whitefield, Bengaluru", budget=30000000, status="Completed",
                 start_date_planned=today - timedelta(days=400),
                 end_date_planned=today - timedelta(days=60),
                 start_date_actual=today - timedelta(days=398),
                 end_date_actual=today - timedelta(days=52))
    p5 = Project(name="Metro Depot Complex", client_id=c3.id, site_engineer_id=eng1.id,
                 location="Sector 21, Gurugram", budget=410000000, status="OnHold",
                 start_date_planned=today - timedelta(days=90),
                 end_date_planned=today + timedelta(days=540),
                 start_date_actual=today - timedelta(days=85))
    db.add_all([p1, p2, p3, p4, p5])
    db.flush()

    def phases_for(project, specs):
        out = []
        for i, (name, status, pct, off_s, off_e) in enumerate(specs, start=1):
            ph = Phase(project_id=project.id, name=name, sequence_order=i, status=status,
                       percent_complete=pct,
                       planned_start=today + timedelta(days=off_s),
                       planned_end=today + timedelta(days=off_e))
            out.append(ph)
        db.add_all(out)
        db.flush()
        return out

    ph1 = phases_for(p1, [("Foundation", "Completed", 100, -180, -100),
                          ("Structure", "InProgress", 55, -95, 120),
                          ("Finishing", "NotStarted", 0, 125, 350)])
    phases_for(p2, [("Site Prep", "NotStarted", 0, 45, 90),
                    ("Foundation", "NotStarted", 0, 95, 180)])
    ph3 = phases_for(p3, [("Foundation", "Completed", 100, -120, -60),
                          ("Structure", "Delayed", 40, -55, 90),
                          ("Finishing", "NotStarted", 0, 95, 230)])
    phases_for(p4, [("Foundation", "Completed", 100, -400, -320),
                    ("Structure", "Completed", 100, -315, -180),
                    ("Finishing", "Completed", 100, -175, -60)])
    phases_for(p5, [("Earthwork", "InProgress", 30, -90, 30),
                    ("Foundation", "NotStarted", 0, 35, 180),
                    ("Structure", "NotStarted", 0, 185, 420)])

    updates = [
        ProgressUpdate(project_id=p1.id, phase_id=ph1[0].id, updated_by=eng1.id,
                       update_date=today - timedelta(days=100),
                       description="Foundation work completed. Curing done, quality checks passed.",
                       percent_progress=100, status_flag="OnTrack",
                       attachments=[PHOTO_1], visible_to_client=True),
        ProgressUpdate(project_id=p1.id, phase_id=ph1[1].id, updated_by=eng1.id,
                       update_date=today - timedelta(days=10),
                       description="Slab casting for 8th floor completed. Column work for 9th floor in progress.",
                       percent_progress=55, status_flag="OnTrack",
                       attachments=[PHOTO_2], visible_to_client=True),
        ProgressUpdate(project_id=p1.id, phase_id=None, updated_by=admin.id,
                       update_date=today - timedelta(days=5),
                       description="Internal: steel vendor invoice under dispute, do not share with client.",
                       percent_progress=None, status_flag="OnTrack",
                       attachments=[], visible_to_client=False),
        ProgressUpdate(project_id=p3.id, phase_id=ph3[1].id, updated_by=eng1.id,
                       update_date=today - timedelta(days=3),
                       description="Structure work blocked due to pending municipal NOC. Escalated to authorities.",
                       percent_progress=40, status_flag="Blocked",
                       attachments=[], visible_to_client=True),
        ProgressUpdate(project_id=p3.id, phase_id=ph3[0].id, updated_by=eng1.id,
                       update_date=today - timedelta(days=62),
                       description="Foundation completed for all 12 villa plots.",
                       percent_progress=100, status_flag="OnTrack",
                       attachments=[PHOTO_1], visible_to_client=True),
        ProgressUpdate(project_id=p4.id, phase_id=None, updated_by=eng2.id,
                       update_date=today - timedelta(days=52),
                       description="Project handover completed. Snag list closed.",
                       percent_progress=100, status_flag="OnTrack",
                       attachments=[], visible_to_client=True),
        ProgressUpdate(project_id=p5.id, phase_id=None, updated_by=eng1.id,
                       update_date=today - timedelta(days=20),
                       description="Project placed on hold pending land acquisition clearance.",
                       percent_progress=None, status_flag="Delayed",
                       attachments=[], visible_to_client=True),
    ]
    db.add_all(updates)
    db.commit()
