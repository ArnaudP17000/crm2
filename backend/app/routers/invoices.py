from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import Invoice, InvoiceLine, Payment, Quote
from ..auth import get_current_user

router = APIRouter(prefix='/api/invoices', tags=['invoices'])

class LineIn(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    vat_rate: float = 0

class InvoiceIn(BaseModel):
    contact_id: Optional[int] = None
    quote_id: Optional[int] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    nature_operation: str = 'prestation_services'
    franchise_tva: bool = True
    mode_paiement: str = 'virement'
    adresse_livraison: Optional[str] = None
    lines: List[LineIn] = []

class PaymentIn(BaseModel):
    amount: float
    method: str = 'virement'
    reference: Optional[str] = None
    date: Optional[str] = None

def _next_number(db):
    year = datetime.now().year
    last = db.query(Invoice).filter(Invoice.number.like(f'FAC-{year}-%')).order_by(Invoice.id.desc()).first()
    if last and last.number:
        try:
            seq = int(last.number.split('-')[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f'FAC-{year}-{seq:04d}'

def invoice_dict(inv, with_lines=False):
    paid = sum(p.amount for p in inv.payments) if inv.payments else 0
    siren_client = (inv.contact.siren if inv.contact else '') or ''
    franchise = getattr(inv, 'franchise_tva', True)
    # Conformité Factur-X
    conformite = {
        'siren_emetteur':  True,
        'siren_client':    bool(siren_client),
        'nature_operation': bool(inv.nature_operation),
        'lignes':          len(inv.lines) > 0 if with_lines else True,
        'echeance':        bool(inv.due_date),
        'mode_paiement':   bool(inv.mode_paiement),
    }
    d = {
        'id': inv.id,
        'number': inv.number,
        'status': inv.status,
        'date': inv.date.isoformat() if inv.date else None,
        'due_date': inv.due_date.isoformat() if inv.due_date else None,
        'total_ht': inv.total_ht,
        'total_ttc': inv.total_ttc,
        'paid': round(paid, 2),
        'remaining': round((inv.total_ttc or 0) - paid, 2),
        'notes': inv.notes,
        'contact_id': inv.contact_id,
        'contact_nom': inv.contact.nom if inv.contact else '',
        'contact_siren': siren_client,
        'quote_id': inv.quote_id,
        'nature_operation': inv.nature_operation or 'prestation_services',
        'franchise_tva': franchise,
        'mode_paiement': inv.mode_paiement or 'virement',
        'adresse_livraison': inv.adresse_livraison,
        'facturx_conforme': all(conformite.values()),
        'conformite': conformite,
        'created_at': inv.created_at.isoformat() if inv.created_at else None,
    }
    if with_lines:
        d['lines'] = [{
            'id': l.id, 'description': l.description,
            'quantity': l.quantity, 'unit_price': l.unit_price,
            'vat_rate': l.vat_rate, 'total': l.total,
        } for l in inv.lines]
        d['payments'] = [{
            'id': p.id, 'amount': p.amount, 'method': p.method,
            'reference': p.reference,
            'date': p.date.isoformat() if p.date else None,
        } for p in inv.payments]
    return d

@router.get('')
def list_invoices(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [invoice_dict(inv) for inv in db.query(Invoice).order_by(Invoice.id.desc()).all()]

@router.post('')
def create_invoice(body: InvoiceIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_ht  = round(sum(l.quantity * l.unit_price for l in body.lines), 2)
    total_ttc = round(sum(l.quantity * l.unit_price * (1 + l.vat_rate / 100) for l in body.lines), 2)
    inv = Invoice(
        number=_next_number(db),
        contact_id=body.contact_id,
        quote_id=body.quote_id,
        due_date=datetime.fromisoformat(body.due_date) if body.due_date else None,
        notes=body.notes,
        status='brouillon',
        total_ht=total_ht,
        total_ttc=total_ttc,
        nature_operation=body.nature_operation,
        franchise_tva=body.franchise_tva,
        mode_paiement=body.mode_paiement,
        adresse_livraison=body.adresse_livraison,
    )
    db.add(inv); db.flush()
    for l in body.lines:
        db.add(InvoiceLine(
            invoice_id=inv.id,
            description=l.description,
            quantity=l.quantity,
            unit_price=l.unit_price,
            vat_rate=l.vat_rate,
            total=round(l.quantity * l.unit_price * (1 + l.vat_rate / 100), 2),
        ))
    db.commit(); db.refresh(inv)
    return invoice_dict(inv, with_lines=True)

@router.post('/from-quote/{quote_id}')
def invoice_from_quote(quote_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.get(Quote, quote_id)
    if not q: raise HTTPException(404, 'Devis introuvable')
    inv = Invoice(
        number=_next_number(db),
        contact_id=q.contact_id,
        quote_id=q.id,
        status='brouillon',
        total_ht=q.total_ht,
        total_ttc=q.total_ttc,
        notes=q.notes,
    )
    db.add(inv); db.flush()
    for l in q.lines:
        db.add(InvoiceLine(
            invoice_id=inv.id,
            description=l.description,
            quantity=l.quantity,
            unit_price=l.unit_price,
            vat_rate=l.vat_rate,
            total=l.total,
        ))
    q.status = 'accepte'
    db.commit(); db.refresh(inv)
    return invoice_dict(inv, with_lines=True)

@router.get('/{id}')
def get_invoice(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    return invoice_dict(inv, with_lines=True)

@router.patch('/{id}/status')
def update_status(id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    inv.status = body.get('status', inv.status)
    db.commit(); db.refresh(inv)
    return invoice_dict(inv)

@router.post('/{id}/payments')
def add_payment(id: int, body: PaymentIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    p = Payment(
        invoice_id=id,
        amount=body.amount,
        method=body.method,
        reference=body.reference,
        date=datetime.fromisoformat(body.date) if body.date else datetime.utcnow(),
    )
    db.add(p)
    paid = sum(pm.amount for pm in inv.payments) + body.amount
    if paid >= (inv.total_ttc or 0):
        inv.status = 'paye'
    db.commit(); db.refresh(inv)
    return invoice_dict(inv, with_lines=True)

@router.delete('/{id}')
def delete_invoice(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    db.delete(inv); db.commit()
    return {'ok': True}

@router.get('/{id}/pdf')
def download_pdf(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    from ..services.facturx_service import generate_facturx
    pdf_bytes = generate_facturx(inv, inv.contact)
    filename = f"{inv.number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post('/{id}/send')
def send_invoice(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    if not inv.contact or not inv.contact.email:
        raise HTTPException(400, "Ce contact n'a pas d'adresse email")
    from ..services.facturx_service import generate_facturx
    from ..services.email_service import send_invoice as _send
    pdf_bytes = generate_facturx(inv, inv.contact)
    result = _send(inv, inv.contact, pdf_bytes)
    inv.status = 'envoye'
    db.commit()
    return result

@router.get('/{id}/xml')
def download_xml(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Invoice, id)
    if not inv: raise HTTPException(404)
    from ..services.facturx_service import _xml_facturx
    xml_bytes = _xml_facturx(inv, inv.contact)
    filename = f"{inv.number}-facturx.xml"
    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
