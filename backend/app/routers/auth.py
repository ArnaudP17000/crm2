from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth import verify_password, create_token, hash_password

router = APIRouter(prefix='/api/auth', tags=['auth'])

class LoginIn(BaseModel):
    email: str
    password: str

@router.post('/login')
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Identifiants incorrects')
    return {'access_token': create_token(user.id), 'role': user.role, 'nom': user.nom}
