from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import ProfileResponse, ProfileUpdateRequest
from ..security import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])

@router.get("", response_model=ProfileResponse)
def get_profile(user: User = Depends(get_current_user)):
    return user

@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.name = payload.name.strip()
    user.phone = payload.phone.strip()
    db.commit()
    db.refresh(user)
    return user
