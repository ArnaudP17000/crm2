from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from ..database import get_db
from ..models import Contact, Opportunity, Quote, Invoice, Activity, Payment
from ..auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix='/api/dashboard', tags=['dashboard'])

@router.get('/stats')
def stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.utcnow()
    year = now.year

    # KPIs de base
    nb_contacts   = db.query(Contact).count()
    nb_opps_actives = db.query(Opportunity).filter(Opportunity.stage.notin_(['gagne','perdu'])).count()
    nb_devis_envoyes = db.query(Quote).filter(Quote.status == 'envoye').count()
    nb_fact_retard   = db.query(Invoice).filter(Invoice.status == 'en_retard').count()

    # CA encaissé cette année (factures payées)
    invoices_payees = db.query(Invoice).filter(Invoice.status == 'paye').all()
    ca_annee = sum(i.total_ttc or 0 for i in invoices_payees)

    # En attente de paiement
    en_attente = db.query(Invoice).filter(Invoice.status.in_(['envoye', 'en_retard'])).all()
    total_en_attente = sum((i.total_ttc or 0) - sum(p.amount for p in i.payments) for i in en_attente)

    # Pipeline par étape (montants)
    stages_data = []
    for stage in ['nouveau', 'qualifie', 'proposition', 'negociation', 'gagne']:
        opps = db.query(Opportunity).filter(Opportunity.stage == stage).all()
        stages_data.append({
            'stage': stage,
            'count': len(opps),
            'montant': sum(o.amount or 0 for o in opps),
        })

    # CA mensuel 6 derniers mois
    ca_mensuel = []
    for i in range(5, -1, -1):
        dt = now.replace(day=1) - timedelta(days=i*30)
        mois = dt.strftime('%b')
        invs = db.query(Invoice).filter(
            Invoice.status == 'paye',
            func.strftime('%Y-%m', Invoice.date) == dt.strftime('%Y-%m')
        ).all()
        ca_mensuel.append({'mois': mois, 'ca': round(sum(i.total_ttc or 0 for i in invs), 2)})

    # Contacts par statut
    contacts_statuts = []
    for statut in ['prospect', 'qualifie', 'client', 'inactif']:
        n = db.query(Contact).filter(Contact.statut == statut).count()
        contacts_statuts.append({'statut': statut, 'count': n})

    # Activités récentes
    recent = db.query(Activity).order_by(Activity.date.desc()).limit(8).all()

    return {
        'contacts':           nb_contacts,
        'opportunities':      nb_opps_actives,
        'quotes_pending':     nb_devis_envoyes,
        'invoices_overdue':   nb_fact_retard,
        'ca_annee':           round(ca_annee, 2),
        'total_en_attente':   round(total_en_attente, 2),
        'pipeline':           stages_data,
        'ca_mensuel':         ca_mensuel,
        'contacts_statuts':   contacts_statuts,
        'recent_activities': [{
            'id': a.id, 'subject': a.subject, 'type': a.type,
            'date': a.date.isoformat() if a.date else None,
            'contact_nom': a.contact.nom if a.contact else '',
        } for a in recent],
    }
