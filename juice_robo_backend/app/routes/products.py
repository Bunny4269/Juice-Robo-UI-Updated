from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product
from ..schemas import ProductResponse

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=list[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return list(db.scalars(
        select(Product).where(Product.is_available.is_(True)).order_by(Product.id)
    ))
