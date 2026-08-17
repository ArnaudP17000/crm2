from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
import os

SECRET_KEY = os.getenv('SECRET_KEY', 'change-me-in-production')
ALGORITHM  = 'HS256'
EXPIRE_DAYS = 30

bearer = HTTPBearer()

def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({'sub': str(user_id), 'exp': exp}, SECRET_KEY, ALGORITHM)

def create_temp_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=5)
    return jwt.encode({'sub': str(user_id), 'exp': exp, 'totp_pending': True}, SECRET_KEY, ALGORITHM)

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload['sub'])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token invalide')
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Utilisateur introuvable')
    return user
