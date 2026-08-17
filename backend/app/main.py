from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, contacts, dashboard, opportunities, quotes, invoices, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Surf Atlantique CRM')

import os
_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
app.add_middleware(CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(dashboard.router)
app.include_router(opportunities.router)
app.include_router(quotes.router)
app.include_router(invoices.router)
app.include_router(settings.router)

@app.get('/api/health')
def health():
    return {'status': 'ok'}
