from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import enum

class ContactStatut(str, enum.Enum):
    prospect = 'prospect'
    qualifie = 'qualifie'
    client   = 'client'
    inactif  = 'inactif'

class OpportunityStage(str, enum.Enum):
    nouveau      = 'nouveau'
    qualifie     = 'qualifie'
    proposition  = 'proposition'
    negociation  = 'negociation'
    gagne        = 'gagne'
    perdu        = 'perdu'

class Contact(Base):
    __tablename__ = 'contacts'
    id          = Column(Integer, primary_key=True)
    nom         = Column(String(200), nullable=False)
    type        = Column(String(100))
    email       = Column(String(200))
    telephone   = Column(String(50))
    whatsapp    = Column(String(50))
    site_web    = Column(String(300))
    instagram   = Column(String(100))
    adresse     = Column(Text)
    code_postal = Column(String(10))
    ville       = Column(String(100))
    region      = Column(String(100))
    siren       = Column(String(14))
    google_rating = Column(Float)
    statut      = Column(String(50), default='prospect')
    notes       = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    activities    = relationship('Activity', back_populates='contact', cascade='all, delete-orphan')
    opportunities = relationship('Opportunity', back_populates='contact')
    quotes        = relationship('Quote', back_populates='contact')
    invoices      = relationship('Invoice', back_populates='contact')

class Activity(Base):
    __tablename__ = 'activities'
    id          = Column(Integer, primary_key=True)
    contact_id  = Column(Integer, ForeignKey('contacts.id'), nullable=False)
    type        = Column(String(50), default='note')  # note, email, appel, rdv
    subject     = Column(String(300))
    description = Column(Text)
    date        = Column(DateTime, default=datetime.utcnow)
    statut      = Column(String(50), default='fait')
    created_at  = Column(DateTime, default=datetime.utcnow)

    contact = relationship('Contact', back_populates='activities')

class Opportunity(Base):
    __tablename__ = 'opportunities'
    id           = Column(Integer, primary_key=True)
    contact_id   = Column(Integer, ForeignKey('contacts.id'))
    nom          = Column(String(300), nullable=False)
    stage        = Column(String(50), default='nouveau')
    amount       = Column(Float, default=0)
    probability  = Column(Integer, default=20)
    close_date   = Column(DateTime)
    source       = Column(String(100))
    notes        = Column(Text)
    created_at   = Column(DateTime, default=datetime.utcnow)

    contact = relationship('Contact', back_populates='opportunities')

class Quote(Base):
    __tablename__ = 'quotes'
    id           = Column(Integer, primary_key=True)
    contact_id   = Column(Integer, ForeignKey('contacts.id'))
    number       = Column(String(20), unique=True)
    date         = Column(DateTime, default=datetime.utcnow)
    validity_date = Column(DateTime)
    status       = Column(String(50), default='brouillon')
    total_ht     = Column(Float, default=0)
    total_ttc    = Column(Float, default=0)
    notes        = Column(Text)
    created_at   = Column(DateTime, default=datetime.utcnow)

    contact = relationship('Contact', back_populates='quotes')
    lines   = relationship('QuoteLine', back_populates='quote', cascade='all, delete-orphan')

class QuoteLine(Base):
    __tablename__ = 'quote_lines'
    id          = Column(Integer, primary_key=True)
    quote_id    = Column(Integer, ForeignKey('quotes.id'))
    description = Column(Text)
    quantity    = Column(Float, default=1)
    unit_price  = Column(Float, default=0)
    vat_rate    = Column(Float, default=0)
    total       = Column(Float, default=0)

    quote = relationship('Quote', back_populates='lines')

class Invoice(Base):
    __tablename__ = 'invoices'
    id                = Column(Integer, primary_key=True)
    contact_id        = Column(Integer, ForeignKey('contacts.id'))
    quote_id          = Column(Integer, ForeignKey('quotes.id'), nullable=True)
    number            = Column(String(20), unique=True)
    date              = Column(DateTime, default=datetime.utcnow)
    due_date          = Column(DateTime)
    status            = Column(String(50), default='brouillon')
    total_ht          = Column(Float, default=0)
    total_ttc         = Column(Float, default=0)
    notes             = Column(Text)
    # Champs Factur-X obligatoires 2026/2027
    nature_operation  = Column(String(50), default='prestation_services')
    adresse_livraison = Column(Text)
    franchise_tva     = Column(Boolean, default=True)
    mode_paiement     = Column(String(50), default='virement')
    created_at        = Column(DateTime, default=datetime.utcnow)

    contact  = relationship('Contact', back_populates='invoices')
    lines    = relationship('InvoiceLine', back_populates='invoice', cascade='all, delete-orphan')
    payments = relationship('Payment', back_populates='invoice', cascade='all, delete-orphan')

class InvoiceLine(Base):
    __tablename__ = 'invoice_lines'
    id          = Column(Integer, primary_key=True)
    invoice_id  = Column(Integer, ForeignKey('invoices.id'))
    description = Column(Text)
    quantity    = Column(Float, default=1)
    unit_price  = Column(Float, default=0)
    vat_rate    = Column(Float, default=0)
    total       = Column(Float, default=0)

    invoice = relationship('Invoice', back_populates='lines')

class Payment(Base):
    __tablename__ = 'payments'
    id         = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'))
    date       = Column(DateTime, default=datetime.utcnow)
    amount     = Column(Float)
    method     = Column(String(50))
    reference  = Column(String(100))

    invoice = relationship('Invoice', back_populates='payments')

class User(Base):
    __tablename__ = 'users'
    id            = Column(Integer, primary_key=True)
    email         = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(300), nullable=False)
    nom           = Column(String(100))
    role          = Column(String(50), default='admin')
    created_at    = Column(DateTime, default=datetime.utcnow)
