#!/usr/bin/env python3
"""
Setup initial CRM :
1. Crée les tables
2. Crée le compte admin (Arnaud)
3. Importe les partenaires depuis le CSV exporté
"""
import sys, os, csv
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import engine, SessionLocal
from app.models import Base, User, Contact
from app.auth import hash_password

# 1. Créer les tables
print('Création des tables...')
Base.metadata.create_all(bind=engine)
print('Tables créées ✓')

db = SessionLocal()

# 2. Créer le compte admin si pas encore créé
if not db.query(User).filter(User.email == 'contact@surf-atlantique.fr').first():
    admin = User(
        email='contact@surf-atlantique.fr',
        password_hash=hash_password('SurfAtlantique2026!'),
        nom='Arnaud Phéloup',
        role='admin'
    )
    db.add(admin)
    db.commit()
    print('Compte admin créé ✓')
    print('  Email    : contact@surf-atlantique.fr')
    print('  Password : SurfAtlantique2026!')
    print('  ⚠️  Change le mot de passe après la première connexion !')
else:
    print('Compte admin déjà existant ✓')

# 3. Importer les partenaires depuis le CSV
CSV_PATH = r'C:\surforacle\export_partenaires_mailjet.csv'
if os.path.exists(CSV_PATH):
    print(f'\nImport contacts depuis {CSV_PATH}...')
    imported = 0
    skipped = 0
    with open(CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            email = row.get('email', '').strip()
            nom   = row.get('nom', '').strip()
            if not nom:
                skipped += 1
                continue
            # Éviter les doublons sur l'email
            if email and db.query(Contact).filter(Contact.email == email).first():
                skipped += 1
                continue
            c = Contact(
                nom=nom,
                type=row.get('type', ''),
                email=email or None,
                telephone=row.get('telephone', '') or None,
                whatsapp=row.get('whatsapp', '') or None,
                site_web=row.get('site_web', '') or None,
                instagram=row.get('instagram', '') or None,
                adresse=row.get('adresse', '') or None,
                ville=row.get('ville', '') or None,
                region=row.get('region', '') or None,
                google_rating=float(row['google_rating']) if row.get('google_rating') else None,
                statut='prospect',
            )
            db.add(c)
            imported += 1
    db.commit()
    print(f'  {imported} contacts importés, {skipped} ignorés (doublons ou sans nom) ✓')
else:
    print(f'\nCSV non trouvé ({CSV_PATH}) — import ignoré')

db.close()
print('\nSetup terminé. Lance le backend avec :')
print('  cd C:\\crm\\backend && uvicorn app.main:app --reload')
