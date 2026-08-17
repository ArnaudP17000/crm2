from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import Opportunity, Contact
from ..auth import get_current_user

router = APIRouter(prefix='/api/opportunities', tags=['opportunities'])

class OppIn(BaseModel):
    nom: str
    contact_id: Optional[int] = None
    stage: str = 'nouveau'
    amount: float = 0
    probability: int = 20
    source: Optional[str] = None
    notes: Optional[str] = None

def opp_dict(o):
    return {
        'id': o.id, 'nom': o.nom, 'stage': o.stage, 'amount': o.amount,
        'probability': o.probability,
        'contact_id': o.contact_id,
        'contact_nom': o.contact.nom if o.contact else '',
        'close_date': o.close_date.isoformat() if o.close_date else None,
        'notes': o.notes,
    }

@router.get('')
def list_opps(db: Session = Depends(get_db), _=Depends(get_current_user)):
    opps = db.query(Opportunity).order_by(Opportunity.created_at.desc()).all()
    return [opp_dict(o) for o in opps]

@router.post('')
def create_opp(body: OppIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    o = Opportunity(**body.model_dump())
    db.add(o); db.commit(); db.refresh(o)
    return opp_dict(o)

@router.patch('/{id}')
def update_opp(id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    o = db.get(Opportunity, id)
    if not o: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(o, k): setattr(o, k, v)
    db.commit(); db.refresh(o)
    return opp_dict(o)

@router.delete('/{id}')
def delete_opp(id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    o = db.get(Opportunity, id)
    if not o: raise HTTPException(404)
    db.delete(o); db.commit()
    return {'ok': True}
