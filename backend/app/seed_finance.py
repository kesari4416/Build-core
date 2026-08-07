from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import User
from app.core.security import hash_password
from app.models.finance import Invoice, Payment, ExpenseEntry, BidLineItem, BidLineItemQuote
from app.models.procurement import Vendor, Bid


def seed_finance(db: Session):
    if db.query(Invoice).count() > 0:
        return
    today = date.today()
    admin = db.query(User).filter(User.role == "Admin").first()

    if not db.query(User).filter_by(email="asha@buildcore.com").first():
        db.add(User(email="asha@buildcore.com", password_hash=hash_password("accountant123"),
                    name="Asha Nair", role="Accountant", status="Active", base_salary=90000))
    apex = db.query(Vendor).filter_by(name="Apex Steel Works").first()
    if apex and not db.query(User).filter_by(email="vikram@apexsteel.com").first():
        db.add(User(email="vikram@apexsteel.com", password_hash=hash_password("vendor123"),
                    name="Vikram Rao", role="Vendor", status="Active", linked_vendor_id=apex.id))
    for email, sal in [("kesari4416@gmail.com", 150000), ("raj@buildcore.com", 80000),
                       ("neha@buildcore.com", 80000)]:
        u = db.query(User).filter_by(email=email).first()
        if u and not u.base_salary:
            u.base_salary = sal
    db.flush()

    inv1 = Invoice(project_id=1, client_id=1, invoice_number="INV-1-001", amount=50000000,
                   tax_amount=9000000, issue_date=today - timedelta(days=45),
                   due_date=today - timedelta(days=15), status="Sent",
                   description="Mobilization + foundation milestone", created_by=admin.id)
    inv2 = Invoice(project_id=1, client_id=1, invoice_number="INV-1-002", amount=30000000,
                   tax_amount=5400000, issue_date=today - timedelta(days=10),
                   due_date=today + timedelta(days=20), status="Sent",
                   description="Structure progress — floors 1-8", created_by=admin.id)
    db.add_all([inv1, inv2]); db.flush()
    db.add_all([
        Payment(invoice_id=inv1.id, project_id=1, client_id=1, amount=40000000,
                payment_date=today - timedelta(days=20), payment_method="BankTransfer",
                reference_no="NEFT-88421", received_by=admin.id),
        ExpenseEntry(project_id=1, category="Site Utilities", amount=450000,
                     expense_date=today - timedelta(days=8),
                     description="Generator diesel + temporary power", recorded_by=admin.id),
        ExpenseEntry(project_id=1, category="Fuel", amount=180000,
                     expense_date=today - timedelta(days=3),
                     description="Crane and hoist fuel", recorded_by=admin.id),
    ])

    bp_bid = db.query(Bid).filter_by(bid_package_id=1).first()
    if db.query(BidLineItem).count() == 0:
        li1 = BidLineItem(bid_package_id=1, item_description="Unitized curtain wall panels",
                          unit="m²", quantity_required=4200, cost_code="08-4000")
        li2 = BidLineItem(bid_package_id=1, item_description="Structural glazing sealant works",
                          unit="m", quantity_required=9000, cost_code="08-4000")
        db.add_all([li1, li2]); db.flush()
        if bp_bid:
            db.add_all([
                BidLineItemQuote(bid_id=bp_bid.id, bid_line_item_id=li1.id, quantity_offered=4200,
                                 unit_price=5500, line_total=23100000, lead_time_days=56),
                BidLineItemQuote(bid_id=bp_bid.id, bid_line_item_id=li2.id, quantity_offered=9000,
                                 unit_price=380, line_total=3420000, lead_time_days=56),
            ])
            bp_bid.amount = 26520000
    db.commit()
