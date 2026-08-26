from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(120),
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        Text,
    )

    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )

    orders = relationship(
        "Order",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ============================================================
# LOCATION
# ============================================================

class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
    )

    address: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )

    machines = relationship(
        "Machine",
        back_populates="location",
        cascade="all, delete-orphan",
    )

    orders = relationship(
        "Order",
        back_populates="location",
    )


# ============================================================
# JUICE ROBO MACHINE
# ============================================================

class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    machine_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id"),
        index=True,
    )

    firmware_version: Mapped[str] = mapped_column(
        String(50),
        default="1.0.0",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="OFFLINE",
        index=True,
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )

    location = relationship(
        "Location",
        back_populates="machines",
    )

    orders = relationship(
        "Order",
        back_populates="machine",
    )


# ============================================================
# PRODUCT
# ============================================================

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        unique=True,
    )

    description: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
    )

    image_url: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    is_available: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )


# ============================================================
# ORDER
# ============================================================

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    order_number: Mapped[str] = mapped_column(
        String(40),
        unique=True,
        index=True,
    )

    collection_code: Mapped[str] = mapped_column(
        String(4),
        unique=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
    )

    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"),
        nullable=True,
        index=True,
    )

    machine_id: Mapped[int | None] = mapped_column(
        ForeignKey("machines.id"),
        nullable=True,
        index=True,
    )

    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending_payment",
        index=True,
    )

    payment_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        index=True,
    )

    razorpay_order_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )

    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )

    razorpay_signature: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="confirmed",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
    )

    user = relationship(
        "User",
        back_populates="orders",
    )

    location = relationship(
        "Location",
        back_populates="orders",
    )

    machine = relationship(
        "Machine",
        back_populates="orders",
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


# ============================================================
# ORDER ITEM
# ============================================================

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"),
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        Integer,
    )

    product_name: Mapped[str] = mapped_column(
        String(120),
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
    )

    unit_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
    )

    subtotal: Mapped[float] = mapped_column(
        Numeric(10, 2),
    )

    order = relationship(
        "Order",
        back_populates="items",
    )