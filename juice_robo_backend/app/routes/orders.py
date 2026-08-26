from datetime import datetime, timezone
import secrets

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import select
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from ..database import get_db
from ..models import (
    Location,
    Machine,
    Order,
    OrderItem,
    Product,
    User,
)

from ..schemas import (
    CreateOrderRequest,
    OrderItemResponse,
    OrderResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
)

from ..security import get_current_user


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


# ============================================================
# SERIALIZE ORDER
# ============================================================

def serialize_order(
    order: Order,
) -> OrderResponse:

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        collection_code=order.collection_code,
        total_amount=float(order.total_amount),
        status=order.status,
        created_at=order.created_at,
        location_id=order.location_id,
        machine_id=order.machine_id,
        items=[
            OrderItemResponse(
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                subtotal=float(item.subtotal),
            )
            for item in order.items
        ],
    )


# ============================================================
# COLLECTION CODE
# ============================================================

def new_code(
    db: Session,
) -> str:

    for _ in range(100):

        code = f"{secrets.randbelow(10000):04d}"

        existing = db.scalar(
            select(Order).where(
                Order.collection_code == code
            )
        )

        if not existing:
            return code

    raise HTTPException(
        status_code=500,
        detail="Could not generate collection code",
    )


# ============================================================
# CREATE ORDER
# ============================================================

@router.post(
    "",
    response_model=OrderResponse,
)
def create_order(

    payload: CreateOrderRequest,

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),

):

    # --------------------------------------------------------
    # VALIDATE ITEMS
    # --------------------------------------------------------

    if not payload.items:

        raise HTTPException(
            status_code=400,
            detail="Order must contain at least one item",
        )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    location = None

    if payload.location_id is not None:

        location = db.scalar(
            select(Location).where(
                Location.id == payload.location_id
            )
        )

        if not location:

            raise HTTPException(
                status_code=404,
                detail="Location not found",
            )

        if not location.is_active:

            raise HTTPException(
                status_code=400,
                detail="Location is inactive",
            )

    # --------------------------------------------------------
    # MACHINE
    # --------------------------------------------------------

    machine = None

    if payload.machine_id is not None:

        machine = db.scalar(
            select(Machine).where(
                Machine.id == payload.machine_id
            )
        )

        if not machine:

            raise HTTPException(
                status_code=404,
                detail="Machine not found",
            )

        if (
            location
            and machine.location_id != location.id
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Machine does not belong "
                    "to the selected location"
                ),
            )

    # --------------------------------------------------------
    # PRODUCTS
    # --------------------------------------------------------

    product_ids = [
        item.product_id
        for item in payload.items
    ]

    products = {
        product.id: product
        for product in db.scalars(
            select(Product).where(
                Product.id.in_(product_ids)
            )
        )
    }

    if (
        len(products)
        != len(set(product_ids))
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "One or more products do not exist"
            ),
        )

    # --------------------------------------------------------
    # BUILD ORDER ITEMS
    # --------------------------------------------------------

    total = 0.0

    order_items = []

    for requested in payload.items:

        if requested.quantity <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Product quantity must be "
                    "greater than zero"
                ),
            )

        product = products[
            requested.product_id
        ]

        if not product.is_available:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{product.name} "
                    "is unavailable"
                ),
            )

        unit_price = float(
            product.price
        )

        subtotal = (
            unit_price
            * requested.quantity
        )

        total += subtotal

        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=requested.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )
        )

    # --------------------------------------------------------
    # CREATE ORDER NUMBER
    # --------------------------------------------------------

    stamp = (
        datetime.now(
            timezone.utc
        )
        .strftime(
            "%Y%m%d%H%M%S"
        )
    )

    order_number = (
        f"JR-{stamp}-"
        f"{secrets.randbelow(1000):03d}"
    )

    # --------------------------------------------------------
    # CREATE PENDING PAYMENT ORDER
    # --------------------------------------------------------

    order = Order(

        order_number=order_number,

        collection_code=new_code(
            db
        ),

        user_id=user.id,

        location_id=(
            location.id
            if location
            else None
        ),

        machine_id=(
            machine.id
            if machine
            else None
        ),

        total_amount=total,

        status="pending_payment",

        payment_status="PENDING",

        items=order_items,

    )

    db.add(order)

    db.commit()

    db.refresh(order)

    # --------------------------------------------------------
    # RELOAD WITH ITEMS
    # --------------------------------------------------------

    order = db.scalar(

        select(Order)

        .options(
            selectinload(
                Order.items
            )
        )

        .where(
            Order.id == order.id
        )

    )

    return serialize_order(
        order
    )


# ============================================================
# GET MY ORDERS
# ============================================================

@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_my_orders(

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),

):

    orders = db.scalars(

        select(Order)

        .options(
            selectinload(
                Order.items
            )
        )

        .where(
            Order.user_id == user.id
        )

        .order_by(
            Order.created_at.desc()
        )

    ).all()

    return [
        serialize_order(order)
        for order in orders
    ]


# ============================================================
# GET SINGLE ORDER
# ============================================================

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(

    order_id: int,

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),

):

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
            detail="Order not found",
        )

    return serialize_order(
        order
    )


# ============================================================
# VERIFY COLLECTION CODE
# ============================================================

@router.post(
    "/verify-code",
    response_model=VerifyCodeResponse,
)
def verify_code(

    payload: VerifyCodeRequest,

    db: Session = Depends(
        get_db
    ),

):

    order = db.scalar(

        select(Order)

        .options(
            selectinload(
                Order.items
            )
        )

        .where(
            Order.collection_code
            == payload.code
        )

    )

    if not order:

        return VerifyCodeResponse(
            success=False,
            message="Invalid collection code",
        )

    # --------------------------------------------------------
    # PAYMENT CHECK
    # --------------------------------------------------------

    if order.payment_status != "PAID":

        return VerifyCodeResponse(
            success=False,
            message=(
                "Payment has not been completed"
            ),
        )

    # --------------------------------------------------------
    # ALREADY COLLECTED
    # --------------------------------------------------------

    if order.status == "collected":

        return VerifyCodeResponse(
            success=False,
            message=(
                "Order already collected"
            ),
        )

    # --------------------------------------------------------
    # CANCELLED
    # --------------------------------------------------------

    if order.status == "cancelled":

        return VerifyCodeResponse(
            success=False,
            message="Order is cancelled",
        )

    # --------------------------------------------------------
    # COLLECT
    # --------------------------------------------------------

    order.status = "collected"

    db.commit()

    db.refresh(order)

    return VerifyCodeResponse(
        success=True,
        message=(
            "Order verified successfully"
        ),
        order=serialize_order(
            order
        ),
    )