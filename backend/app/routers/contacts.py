from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from ..database import get_db
from ..models import Contact, Activity
from ..auth import get_current_user
from datetime import datetime

router = APIRouter(prefix='/api/contacts', tags=['contacts'])

class ContactIn(BaseModel):
    nom: str
    type: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    whatsapp: Optional[str] = None
    site_web: Optional[str] = None
    instagram: Optional[str] = None
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    region: Optional[str] = None
    siren: Optional[str] = None
    statut: str = 'prospect'
    notes: Optional[str] = None

class ActivityIn(BaseModel):
    type: str = 'note'
    subject: str
    description: Optional[str] = None
    date: Optional[str] = None

def contact_dict(c):
    return {
        'id': c.id, 'nom': c.nom, 'type': c.type, 'email': c.email,
        'telephone': c.telephone, 'whatsapp': c.whatsapp, 'site_web': c.site_web,
        'instagram': c.instagram, 'adresse': c.adresse,
        'code_postal': getattr(c, 'code_postal', None),
        'ville': c.ville, 'region': c.region,
        'siren': getattr(c, 'siren', None),
        'google_rating': c.google_rating, 'statut': c.statut,
        'notes': c.notes, 'created_at': c.created_at.isoformat() if c.created_at else None,
    }

@router.get('')
def list_contacts(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    q = db.query(Contact)
    if search:
        q = q.filter(or_(
            Contact.nom.ilike(f'%{search}%'),
            Contact.email.ilike(f'%{search}%'),
            Contact.ville.ilike(f'%{search}%'),
        ))
    if type:
        q = q.filter(Contact.type == type)
    return [contact_dict(c) for c in q.order_by(Contact.nom).all()]

@router.post('')
def create_contact(body: ContactIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = Contact(**body.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return contact_dict(c)

@router.get('/{id}')
def get_contact(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.get(Contact, id)
    if not c: raise HTTPException(404)
    return contact_dict(c)

@router.put('/{id}')
def update_contact(id: int, body: ContactIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.get(Contact, id)
    if not c: raise HTTPException(404)
    for k, v in body.model_dump().items():
        if hasattr(c, k):
            setattr(c, k, v)
    db.commit(); db.refresh(c)
    return contact_dict(c)

@router.delete('/{id}')
def delete_contact(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.get(Contact, id)
    if not c: raise HTTPException(404)
    db.delete(c); db.commit()
    return {'ok': True}

@router.get('/{id}/activities')
def get_activities(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    acts = db.query(Activity).filter(Activity.contact_id == id).order_by(Activity.date.desc()).all()
    return [{
        'id': a.id, 'type': a.type, 'subject': a.subject,
        'description': a.description,
        'date': a.date.isoformat() if a.date else None,
        'statut': a.statut,
    } for a in acts]

@router.post('/{id}/activities')
def add_activity(id: int, body: ActivityIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = Activity(
        contact_id=id, type=body.type, subject=body.subject,
        description=body.description,
        date=datetime.fromisoformat(body.date) if body.date else datetime.utcnow()
    )
    db.add(a); db.commit(); db.refresh(a)
    return {'id': a.id}
