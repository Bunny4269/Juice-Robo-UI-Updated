from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Location
from ..schemas import (
    LocationCreateRequest,
    LocationResponse,
)


router = APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)


# ============================================================
# GET LOCATIONS
# ============================================================

@router.get(
    "",
    response_model=list[LocationResponse],
)
def get_locations(
    db: Session = Depends(get_db),
):
    locations = db.scalars(
        select(Location)
        .where(Location.is_active.is_(True))
        .order_by(Location.id)
    ).all()

    return list(locations)


# ============================================================
# GET SINGLE LOCATION
# ============================================================

@router.get(
    "/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
):
    location = db.scalar(
        select(Location)
        .where(Location.id == location_id)
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    return location


# ============================================================
# CREATE LOCATION
# ============================================================

@router.post(
    "",
    response_model=LocationResponse,
)
def create_location(
    payload: LocationCreateRequest,
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Location)
        .where(Location.name == payload.name)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Location already exists",
        )

    location = Location(
        name=payload.name,
        address=payload.address,
        is_active=payload.is_active,
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location