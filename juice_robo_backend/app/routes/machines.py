from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Location, Machine
from ..schemas import (
    MachineCreateRequest,
    MachineResponse,
)


router = APIRouter(
    prefix="/api/machines",
    tags=["Machines"],
)


# ============================================================
# GET MACHINES
# ============================================================

@router.get(
    "",
    response_model=list[MachineResponse],
)
def get_machines(
    db: Session = Depends(get_db),
):
    machines = db.scalars(
        select(Machine)
        .order_by(Machine.id)
    ).all()

    return list(machines)


# ============================================================
# GET SINGLE MACHINE
# ============================================================

@router.get(
    "/{machine_id}",
    response_model=MachineResponse,
)
def get_machine(
    machine_id: int,
    db: Session = Depends(get_db),
):
    machine = db.scalar(
        select(Machine)
        .where(Machine.id == machine_id)
    )

    if not machine:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    return machine


# ============================================================
# CREATE MACHINE
# ============================================================

@router.post(
    "",
    response_model=MachineResponse,
)
def create_machine(
    payload: MachineCreateRequest,
    db: Session = Depends(get_db),
):
    location = db.scalar(
        select(Location)
        .where(Location.id == payload.location_id)
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    existing = db.scalar(
        select(Machine)
        .where(
            Machine.machine_code ==
            payload.machine_code
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Machine code already exists",
        )

    machine = Machine(
        machine_code=payload.machine_code,
        name=payload.name,
        location_id=payload.location_id,
        firmware_version=payload.firmware_version,
        status=payload.status,
    )

    db.add(machine)
    db.commit()
    db.refresh(machine)

    return machine


# ============================================================
# MACHINE HEARTBEAT
# ============================================================

@router.post(
    "/{machine_id}/heartbeat",
    response_model=MachineResponse,
)
def machine_heartbeat(
    machine_id: int,
    db: Session = Depends(get_db),
):
    machine = db.scalar(
        select(Machine)
        .where(Machine.id == machine_id)
    )

    if not machine:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    machine.status = "ONLINE"
    machine.last_seen_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(machine)

    return machine