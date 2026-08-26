from decimal import Decimal
from typing import Any

import razorpay

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..database import get_db
from ..models import Order, User
from ..security import get_current_user


router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"],
)

settings = get_settings()


# ============================================================
# RAZORPAY CLIENT
# ============================================================

def get_razorpay_client() -> razorpay.Client:

    if not settings.razorpay_key_id:
        raise HTTPException(
            status_code=500,
            detail="Razorpay key ID is not configured.",
        )

    if not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay key secret is not configured.",
        )

    return razorpay.Client(
        auth=(
            settings.razorpay_key_id,
            settings.razorpay_key_secret,
        )
    )


# ============================================================
# CREATE RAZORPAY ORDER
# ============================================================

@router.post("/create-order")
def create_payment_order(

    payload: dict[str, Any],

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),

):

    # --------------------------------------------------------
    # GET ORDER ID
    # --------------------------------------------------------

    order_id = payload.get("order_id")

    if not order_id:

        raise HTTPException(
            status_code=400,
            detail="order_id is required.",
        )

    try:

        order_id = int(order_id)

    except (
        TypeError,
        ValueError,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid order_id.",
        )

    # --------------------------------------------------------
    # FIND USER ORDER
    # --------------------------------------------------------

    order = db.scalar(

        select(Order)

        .options(
            selectinload(
                Order.items
            )
        )

        .where(
            Order.id == order_id,
            Order.user_id == user.id,
        )

    )

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    # --------------------------------------------------------
    # ALREADY PAID
    # --------------------------------------------------------

    if (
        order.payment_status == "PAID"
        and order.razorpay_order_id
    ):

        return {
            "success": True,
            "already_paid": True,
            "order_id": order.id,
            "order_number": order.order_number,
            "collection_code": order.collection_code,
            "payment_status": order.payment_status,
        }

    # --------------------------------------------------------
    # ORDER MUST BE PENDING PAYMENT
    # --------------------------------------------------------

    if order.payment_status != "PENDING":

        raise HTTPException(
            status_code=400,
            detail=(
                "This order is not available "
                "for payment."
            ),
        )

    # --------------------------------------------------------
    # CALCULATE AMOUNT FROM DATABASE
    # --------------------------------------------------------

    amount_rupees = Decimal(
        str(order.total_amount)
    )

    if amount_rupees <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Order amount must be "
                "greater than zero."
            ),
        )

    amount_paise = int(
        amount_rupees * Decimal("100")
    )

    # --------------------------------------------------------
    # CREATE RAZORPAY ORDER
    # --------------------------------------------------------

    client = get_razorpay_client()

    try:

        razorpay_order = client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order.order_number,
                "notes": {
                    "juice_robo_order_id": str(
                        order.id
                    ),
                    "order_number": (
                        order.order_number
                    ),
                },
            }
        )

    except Exception as exc:

        print(
            "Razorpay order creation failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to create Razorpay order."
            ),
        )

    # --------------------------------------------------------
    # SAVE RAZORPAY ORDER ID
    # --------------------------------------------------------

    order.razorpay_order_id = str(
        razorpay_order["id"]
    )

    order.payment_status = "PENDING"

    order.status = "pending_payment"

    db.commit()

    db.refresh(order)

    # --------------------------------------------------------
    # RETURN CHECKOUT DATA
    # --------------------------------------------------------

    return {
        "success": True,

        "key_id": settings.razorpay_key_id,

        "razorpay_order_id": (
            razorpay_order["id"]
        ),

        "amount": (
            razorpay_order["amount"]
        ),

        "currency": (
            razorpay_order["currency"]
        ),

        "order_id": order.id,

        "order_number": (
            order.order_number
        ),

        "payment_status": (
            order.payment_status
        ),
    }


# ============================================================
# VERIFY RAZORPAY PAYMENT
# ============================================================

@router.post("/verify")
def verify_payment(

    payload: dict[str, Any],

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),

):

    # --------------------------------------------------------
    # GET PAYMENT DATA
    # --------------------------------------------------------

    order_id = payload.get(
        "order_id"
    )

    razorpay_payment_id = payload.get(
        "razorpay_payment_id"
    )

    razorpay_order_id = payload.get(
        "razorpay_order_id"
    )

    razorpay_signature = payload.get(
        "razorpay_signature"
    )

    # --------------------------------------------------------
    # VALIDATE REQUEST
    # --------------------------------------------------------

    if not order_id:

        raise HTTPException(
            status_code=400,
            detail="order_id is required.",
        )

    if not razorpay_payment_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "razorpay_payment_id "
                "is required."
            ),
        )

    if not razorpay_order_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "razorpay_order_id "
                "is required."
            ),
        )

    if not razorpay_signature:

        raise HTTPException(
            status_code=400,
            detail=(
                "razorpay_signature "
                "is required."
            ),
        )

    try:

        order_id = int(order_id)

    except (
        TypeError,
        ValueError,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid order_id.",
        )

    # --------------------------------------------------------
    # LOAD INTERNAL ORDER
    # --------------------------------------------------------

    order = db.scalar(

        select(Order)

        .options(
            selectinload(
                Order.items
            )
        )

        .where(
            Order.id == order_id,
            Order.user_id == user.id,
        )

    )

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    # --------------------------------------------------------
    # IDEMPOTENCY
    # --------------------------------------------------------

    if (
        order.payment_status == "PAID"
        and order.razorpay_payment_id
    ):

        return {
            "success": True,
            "payment_status": "PAID",
            "order_id": order.id,
            "order_number": (
                order.order_number
            ),
            "collection_code": (
                order.collection_code
            ),
            "total_amount": float(
                order.total_amount
            ),
            "status": order.status,
        }

    # --------------------------------------------------------
    # RAZORPAY ORDER ID MUST MATCH DATABASE
    # --------------------------------------------------------

    if not order.razorpay_order_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "No Razorpay order is associated "
                "with this Juice Robo order."
            ),
        )

    if (
        order.razorpay_order_id
        != razorpay_order_id
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Razorpay order ID does not "
                "match the Juice Robo order."
            ),
        )

    # --------------------------------------------------------
    # VERIFY RAZORPAY SIGNATURE
    # --------------------------------------------------------

    client = get_razorpay_client()

    try:

        client.utility.verify_payment_signature(
            {
                "razorpay_order_id":
                    order.razorpay_order_id,

                "razorpay_payment_id":
                    razorpay_payment_id,

                "razorpay_signature":
                    razorpay_signature,
            }
        )

    except Exception as exc:

        print(
            "Razorpay signature verification failed:",
            repr(exc),
        )

        order.payment_status = "FAILED"

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "Payment verification failed."
            ),
        )

    # --------------------------------------------------------
    # PAYMENT SUCCESSFULLY VERIFIED
    # --------------------------------------------------------

    order.razorpay_payment_id = (
        razorpay_payment_id
    )

    order.razorpay_signature = (
        razorpay_signature
    )

    order.payment_status = "PAID"

    order.status = "confirmed"

    db.commit()

    db.refresh(order)

    # --------------------------------------------------------
    # RETURN CONFIRMED ORDER
    # --------------------------------------------------------

    return {
        "success": True,

        "payment_status": "PAID",

        "order_id": order.id,

        "order_number": (
            order.order_number
        ),

        "collection_code": (
            order.collection_code
        ),

        "total_amount": float(
            order.total_amount
        ),

        "status": order.status,

        "razorpay_payment_id": (
            order.razorpay_payment_id
        ),

        "razorpay_order_id": (
            order.razorpay_order_id
        ),

        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": float(
                    item.unit_price
                ),
                "subtotal": float(
                    item.subtotal
                ),
            }
            for item in order.items
        ],
    }