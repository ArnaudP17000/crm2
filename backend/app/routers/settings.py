from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import CompanySettings
from ..auth import get_current_user

router = APIRouter(prefix='/api/settings', tags=['settings'])

class CompanyIn(BaseModel):
    nom:        Optional[str] = ''
    siren:      Optional[str] = ''
    siret:      Optional[str] = ''
    tva_number: Optional[str] = ''
    adresse:    Optional[str] = ''
    code_postal:Optional[str] = ''
    ville:      Optional[str] = ''
    telephone:  Optional[str] = ''
    email:      Optional[str] = ''
    site_web:   Optional[str] = ''
    iban:       Optional[str] = ''
    bic:        Optional[str] = ''
    mentions:   Optional[str] = ''

def _get_or_create(db):
    s = db.query(CompanySettings).first()
    if not s:
        s = CompanySettings()
        db.add(s)
        db.commit()
        db.refresh(s)
    return s

def _dict(s):
    return {
        'nom': s.nom, 'siren': s.siren, 'siret': s.siret,
        'tva_number': s.tva_number, 'adresse': s.adresse,
        'code_postal': s.code_postal, 'ville': s.ville,
        'telephone': s.telephone, 'email': s.email,
        'site_web': s.site_web, 'iban': s.iban,
        'bic': s.bic, 'mentions': s.mentions,
    }

@router.get('/company')
def get_company(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _dict(_get_or_create(db))

@router.put('/company')
def update_company(body: CompanyIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = _get_or_create(db)
    for k, v in body.model_dump().items():
        setattr(s, k, v or '')
    db.commit()
    return _dict(s)
