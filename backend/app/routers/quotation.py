from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.procurement import BidPackage, BidInvitation, Bid
from app.models.finance import BidLineItem, BidLineItemQuote
from app.core.security import get_current_user, require_roles
from app.crud.procurement import f, d

router = APIRouter(tags=["quotation"])
STAFF = require_roles("Admin", "SiteEngineer", "ProcurementOfficer")


class BidLineItemCreate(BaseModel):
    item_description: str = Field(min_length=1)
    unit: Optional[str] = None
    quantity_required: Decimal = 0
    cost_code: Optional[str] = None


class BidLineItemPatch(BaseModel):
    item_description: Optional[str] = None
    unit: Optional[str] = None
    quantity_required: Optional[Decimal] = None
    cost_code: Optional[str] = None


class QuoteIn(BaseModel):
    bid_line_item_id: int
    quantity_offered: Decimal = 0
    unit_price: Decimal = Field(ge=0)
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None


class VendorQuoteIn(BaseModel):
    quotes: List[QuoteIn] = Field(min_length=1)
    notes: Optional[str] = None


def bli_out(li):
    return {"id": li.id, "bid_package_id": li.bid_package_id,
            "item_description": li.item_description, "unit": li.unit,
            "quantity_required": f(li.quantity_required), "cost_code": li.cost_code}


def quote_out(q):
    return {"id": q.id, "bid_id": q.bid_id, "bid_line_item_id": q.bid_line_item_id,
            "quantity_offered": f(q.quantity_offered), "unit_price": f(q.unit_price),
            "line_total": f(q.line_total), "lead_time_days": q.lead_time_days, "notes": q.notes}


def recompute_bid_amount(db, bid):
    total = sum(f(q.line_total) for q in db.query(BidLineItemQuote).filter_by(bid_id=bid.id).all())
    bid.amount = total
    db.commit()


def upsert_quotes(db, bid, quotes):
    for qin in quotes:
        li = db.get(BidLineItem, qin.bid_line_item_id)
        if not li or li.bid_package_id != bid.bid_package_id:
            raise HTTPException(status_code=422, detail=f"Line item {qin.bid_line_item_id} not in this package")
        existing = db.query(BidLineItemQuote).filter_by(bid_id=bid.id,
                                                        bid_line_item_id=qin.bid_line_item_id).first()
        qty = qin.quantity_offered or li.quantity_required
        if existing:
            existing.quantity_offered = qty
            existing.unit_price = qin.unit_price
            existing.line_total = f(qty) * f(qin.unit_price)
            existing.lead_time_days = qin.lead_time_days
            existing.notes = qin.notes
        else:
            db.add(BidLineItemQuote(bid_id=bid.id, bid_line_item_id=qin.bid_line_item_id,
                                    quantity_offered=qty, unit_price=qin.unit_price,
                                    line_total=f(qty) * f(qin.unit_price),
                                    lead_time_days=qin.lead_time_days, notes=qin.notes))
    db.commit()
    recompute_bid_amount(db, bid)


@router.post("/bid-packages/{bp_id}/line-items", status_code=201)
def add_bid_line_item(bp_id: int, body: BidLineItemCreate, db: Session = Depends(get_db),
                      user: User = Depends(STAFF)):
    if not db.get(BidPackage, bp_id):
        raise HTTPException(status_code=404, detail="Bid package not found")
    li = BidLineItem(bid_package_id=bp_id, **body.model_dump())
    db.add(li); db.commit(); db.refresh(li)
    return bli_out(li)


@router.get("/bid-packages/{bp_id}/line-items")
def list_bid_line_items(bp_id: int, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    return [bli_out(li) for li in db.query(BidLineItem).filter_by(bid_package_id=bp_id).all()]


@router.patch("/bid-line-items/{li_id}")
def patch_bid_line_item(li_id: int, body: BidLineItemPatch, db: Session = Depends(get_db),
                        user: User = Depends(STAFF)):
    li = db.get(BidLineItem, li_id)
    if not li:
        raise HTTPException(status_code=404, detail="Line item not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(li, k, v)
    db.commit(); db.refresh(li)
    return bli_out(li)


@router.delete("/bid-line-items/{li_id}", status_code=204)
def delete_bid_line_item(li_id: int, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    li = db.get(BidLineItem, li_id)
    if not li:
        raise HTTPException(status_code=404, detail="Line item not found")
    db.query(BidLineItemQuote).filter_by(bid_line_item_id=li_id).delete()
    db.delete(li); db.commit()


@router.post("/bids/{bid_id}/line-item-quotes", status_code=201)
def add_quotes(bid_id: int, body: VendorQuoteIn, db: Session = Depends(get_db),
               user: User = Depends(STAFF)):
    bid = db.get(Bid, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    upsert_quotes(db, bid, body.quotes)
    return {"bid_id": bid_id, "amount": f(bid.amount),
            "quotes": [quote_out(q) for q in db.query(BidLineItemQuote).filter_by(bid_id=bid_id).all()]}


@router.get("/bids/{bid_id}/line-item-quotes")
def list_quotes(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [quote_out(q) for q in db.query(BidLineItemQuote).filter_by(bid_id=bid_id).all()]


@router.get("/bid-packages")
def list_all_bid_packages(db: Session = Depends(get_db), user: User = Depends(STAFF)):
    from app.models import Project
    out = []
    for bp in db.query(BidPackage).order_by(BidPackage.id.desc()).all():
        p = db.get(Project, bp.project_id)
        out.append({"id": bp.id, "title": bp.title, "status": bp.status,
                    "bid_due_date": d(bp.bid_due_date), "cost_code": bp.cost_code,
                    "project_id": bp.project_id, "project_name": p.name if p else None,
                    "bid_count": db.query(Bid).filter_by(bid_package_id=bp.id).count(),
                    "line_item_count": db.query(BidLineItem).filter_by(bid_package_id=bp.id).count()})
    return out


@router.get("/bid-packages/{bp_id}/comparison")
def comparison(bp_id: int, db: Session = Depends(get_db), user: User = Depends(STAFF)):
    bp = db.get(BidPackage, bp_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Bid package not found")
    items = db.query(BidLineItem).filter_by(bid_package_id=bp_id).all()
    bids = db.query(Bid).filter_by(bid_package_id=bp_id).all()
    out_items = []
    for li in items:
        quotes = []
        prices = []
        for bid in bids:
            q = db.query(BidLineItemQuote).filter_by(bid_id=bid.id, bid_line_item_id=li.id).first()
            if q:
                prices.append(f(q.unit_price))
                quotes.append({"bid_id": bid.id, "vendor_id": bid.vendor_id,
                               "vendor_name": bid.vendor.name if bid.vendor else None,
                               "unit_price": f(q.unit_price), "quantity_offered": f(q.quantity_offered),
                               "line_total": f(q.line_total), "lead_time_days": q.lead_time_days})
        best = min(prices) if prices else None
        for q in quotes:
            q["is_best"] = best is not None and q["unit_price"] == best
        out_items.append({**bli_out(li), "bid_line_item_id": li.id, "quotes": quotes})
    return {"bid_package_id": bp_id, "title": bp.title, "status": bp.status,
            "bid_due_date": d(bp.bid_due_date),
            "vendors": [{"bid_id": b.id, "vendor_id": b.vendor_id,
                         "vendor_name": b.vendor.name if b.vendor else None,
                         "total": f(b.amount), "status": b.status} for b in bids],
            "line_items": out_items}


# ---------- Vendor portal ----------
def get_vendor_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "Vendor" or not getattr(user, "linked_vendor_id", None):
        raise HTTPException(status_code=403, detail="Vendor account required")
    return user


@router.get("/vendor/bid-packages")
def vendor_packages(db: Session = Depends(get_db), user: User = Depends(get_vendor_user)):
    invites = db.query(BidInvitation).filter_by(vendor_id=user.linked_vendor_id).all()
    out = []
    for inv in invites:
        bp = db.get(BidPackage, inv.bid_package_id)
        if not bp:
            continue
        my_bid = db.query(Bid).filter_by(bid_package_id=bp.id, vendor_id=user.linked_vendor_id).first()
        out.append({"id": bp.id, "title": bp.title, "status": bp.status,
                    "bid_due_date": d(bp.bid_due_date), "cost_code": bp.cost_code,
                    "response_status": inv.response_status,
                    "my_bid_amount": f(my_bid.amount) if my_bid else None})
    return out


@router.get("/vendor/bid-packages/{bp_id}")
def vendor_package_detail(bp_id: int, db: Session = Depends(get_db),
                          user: User = Depends(get_vendor_user)):
    inv = db.query(BidInvitation).filter_by(bid_package_id=bp_id,
                                            vendor_id=user.linked_vendor_id).first()
    if not inv:
        raise HTTPException(status_code=403, detail="Not invited to this bid package")
    bp = db.get(BidPackage, bp_id)
    if inv.response_status == "Invited":
        inv.response_status = "Viewed"
        db.commit()
    my_bid = db.query(Bid).filter_by(bid_package_id=bp_id, vendor_id=user.linked_vendor_id).first()
    my_quotes = {q.bid_line_item_id: quote_out(q)
                 for q in db.query(BidLineItemQuote).filter_by(bid_id=my_bid.id).all()} if my_bid else {}
    items = [bli_out(li) for li in db.query(BidLineItem).filter_by(bid_package_id=bp_id).all()]
    for it in items:
        it["my_quote"] = my_quotes.get(it["id"])
    return {"id": bp.id, "title": bp.title, "scope_description": bp.scope_description,
            "status": bp.status, "bid_due_date": d(bp.bid_due_date),
            "my_bid_amount": f(my_bid.amount) if my_bid else None, "line_items": items}


@router.post("/vendor/bid-packages/{bp_id}/quote", status_code=201)
def vendor_quote(bp_id: int, body: VendorQuoteIn, db: Session = Depends(get_db),
                 user: User = Depends(get_vendor_user)):
    inv = db.query(BidInvitation).filter_by(bid_package_id=bp_id,
                                            vendor_id=user.linked_vendor_id).first()
    if not inv:
        raise HTTPException(status_code=403, detail="Not invited to this bid package")
    bp = db.get(BidPackage, bp_id)
    if bp.status not in ("Open", "Draft"):
        raise HTTPException(status_code=422, detail="Bidding is closed for this package")
    bid = db.query(Bid).filter_by(bid_package_id=bp_id, vendor_id=user.linked_vendor_id).first()
    if not bid:
        bid = Bid(bid_package_id=bp_id, vendor_id=user.linked_vendor_id, amount=0, notes=body.notes)
        db.add(bid); db.flush()
    upsert_quotes(db, bid, body.quotes)
    inv.response_status = "Submitted"
    db.commit()
    return {"bid_id": bid.id, "amount": f(bid.amount), "message": "Quote submitted"}
