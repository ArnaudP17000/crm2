from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
from ..database import get_db
from ..models import Quote, QuoteLine, Contact
from ..auth import get_current_user

router = APIRouter(prefix='/api/quotes', tags=['quotes'])

class LineIn(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    vat_rate: float = 0

class QuoteIn(BaseModel):
    contact_id: Optional[int] = None
    validity_date: Optional[str] = None
    notes: Optional[str] = None
    lines: List[LineIn] = []

def _compute_totals(lines):
    total_ht = sum(l.quantity * l.unit_price for l in lines)
    total_ttc = sum(l.quantity * l.unit_price * (1 + l.vat_rate / 100) for l in lines)
    return round(total_ht, 2), round(total_ttc, 2)

def _next_number(db):
    year = datetime.now().year
    last = db.query(Quote).filter(Quote.number.like(f'DEV-{year}-%')).order_by(Quote.id.desc()).first()
    if last and last.number:
        try:
            seq = int(last.number.split('-')[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f'DEV-{year}-{seq:04d}'

def quote_dict(q, with_lines=False):
    d = {
        'id': q.id,
        'number': q.number,
        'status': q.status,
        'date': q.date.isoformat() if q.date else None,
        'validity_date': q.validity_date.isoformat() if q.validity_date else None,
        'total_ht': q.total_ht,
        'total_ttc': q.total_ttc,
        'notes': q.notes,
        'contact_id': q.contact_id,
        'contact_nom': q.contact.nom if q.contact else '',
        'created_at': q.created_at.isoformat() if q.created_at else None,
    }
    if with_lines:
        d['lines'] = [{
            'id': l.id, 'description': l.description,
            'quantity': l.quantity, 'unit_price': l.unit_price,
            'vat_rate': l.vat_rate, 'total': l.total,
        } for l in q.lines]
    return d

@router.get('')
def list_quotes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [quote_dict(q) for q in db.query(Quote).order_by(Quote.id.desc()).all()]

@router.post('')
def create_quote(body: QuoteIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_ht, total_ttc = _compute_totals(body.lines)
    q = Quote(
        number=_next_number(db),
        contact_id=body.contact_id,
        validity_date=datetime.fromisoformat(body.validity_date) if body.validity_date else None,
        notes=body.notes,
        status='brouillon',
        total_ht=total_ht,
        total_ttc=total_ttc,
    )
    db.add(q); db.flush()
    for l in body.lines:
        line = QuoteLine(
            quote_id=q.id,
            description=l.description,
            quantity=l.quantity,
            unit_price=l.unit_price,
            vat_rate=l.vat_rate,
            total=round(l.quantity * l.unit_price * (1 + l.vat_rate / 100), 2),
        )
        db.add(line)
    db.commit(); db.refresh(q)
    return quote_dict(q, with_lines=True)

@router.get('/{id}')
def get_quote(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    return quote_dict(q, with_lines=True)

@router.put('/{id}')
def update_quote(id: int, body: QuoteIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    q.contact_id    = body.contact_id
    q.validity_date = datetime.fromisoformat(body.validity_date) if body.validity_date else None
    q.notes         = body.notes
    # Remplace les lignes
    for line in q.lines:
        db.delete(line)
    db.flush()
    total_ht, total_ttc = _compute_totals(body.lines)
    q.total_ht  = total_ht
    q.total_ttc = total_ttc
    for l in body.lines:
        db.add(QuoteLine(
            quote_id=q.id, description=l.description,
            quantity=l.quantity, unit_price=l.unit_price,
            vat_rate=l.vat_rate,
            total=round(l.quantity * l.unit_price * (1 + l.vat_rate / 100), 2),
        ))
    db.commit(); db.refresh(q)
    return quote_dict(q, with_lines=True)

@router.patch('/{id}/status')
def update_status(id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    q.status = body.get('status', q.status)
    db.commit(); db.refresh(q)
    return quote_dict(q)

@router.delete('/{id}')
def delete_quote(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    db.delete(q); db.commit()
    return {'ok': True}

@router.get('/{id}/pdf')
def download_pdf(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    from ..services.quote_pdf_service import generate_quote_pdf
    pdf_bytes = generate_quote_pdf(q, q.contact)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{q.number}.pdf"'}
    )

@router.post('/{id}/send')
def send_quote(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, id)
    if not q: raise HTTPException(404)
    if not q.contact or not q.contact.email:
        raise HTTPException(400, "Ce contact n'a pas d'adresse email")
    from ..services.quote_pdf_service import generate_quote_pdf
    from ..services.email_service import send_quote as _send
    pdf_bytes = generate_quote_pdf(q, q.contact)
    result = _send(q, q.contact, pdf_bytes)
    # Passer le statut à "envoyé"
    q.status = 'envoye'
    db.commit()
    return result
