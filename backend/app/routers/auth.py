from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import pyotp, qrcode, io, base64
from ..database import get_db
from ..models import User
from ..auth import (verify_password, create_token, create_temp_token,
                    hash_password, get_current_user, jwt, JWTError, SECRET_KEY, ALGORITHM)

router = APIRouter(prefix='/api/auth', tags=['auth'])

class LoginIn(BaseModel):
    email: str
    password: str

class TotpVerifyIn(BaseModel):
    temp_token: str
    code: str

class TotpCodeIn(BaseModel):
    code: str

@router.post('/login')
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Identifiants incorrects')
    if user.totp_enabled:
        return {'totp_required': True, 'temp_token': create_temp_token(user.id)}
    return {'access_token': create_token(user.id), 'role': user.role, 'nom': user.nom}

@router.post('/totp/verify')
def totp_verify(body: TotpVerifyIn, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.temp_token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get('totp_pending'):
            raise HTTPException(400, 'Token invalide')
        user_id = int(payload['sub'])
    except JWTError:
        raise HTTPException(401, 'Token expiré ou invalide')
    user = db.get(User, user_id)
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(400, 'TOTP non configuré')
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(401, 'Code incorrect')
    return {'access_token': create_token(user.id), 'role': user.role, 'nom': user.nom}

@router.get('/totp/setup')
def totp_setup(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name='surf-atlantique CRM')
    # QR code as base64 PNG
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return {'secret': secret, 'otpauth_uri': uri, 'qr_base64': qr_b64}

@router.post('/totp/enable')
def totp_enable(body: TotpCodeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.totp_secret:
        raise HTTPException(400, 'Lance d\'abord GET /totp/setup')
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(401, 'Code incorrect')
    user.totp_enabled = True
    db.commit()
    return {'ok': True, 'message': '2FA activé'}

@router.post('/totp/disable')
def totp_disable(body: TotpCodeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(400, '2FA non activé')
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(401, 'Code incorrect')
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {'ok': True, 'message': '2FA désactivé'}

@router.get('/me')
def me(user: User = Depends(get_current_user)):
    return {'id': user.id, 'email': user.email, 'nom': user.nom,
            'role': user.role, 'totp_enabled': user.totp_enabled}
