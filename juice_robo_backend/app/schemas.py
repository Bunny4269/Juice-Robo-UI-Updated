from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# ============================================================
# AUTH
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    email: EmailStr

    phone: str = Field(
        min_length=10,
        max_length=20,
    )

    password: str = Field(
        min_length=6,
        max_length=128,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ============================================================
# PROFILE
# ============================================================

class ProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    email: EmailStr
    phone: str
    is_admin: bool
    created_at: datetime


class ProfileUpdateRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    phone: str = Field(
        min_length=10,
        max_length=20,
    )


# ============================================================
# PRODUCTS
# ============================================================

class ProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    description: str
    price: float
    image_url: str
    is_available: bool


# ============================================================
# LOCATIONS
# ============================================================

class LocationResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    address: str
    is_active: bool


class LocationCreateRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150,
    )

    address: str = Field(
        default="",
        max_length=500,
    )

    is_active: bool = True


# ============================================================
# MACHINES
# ============================================================

class MachineResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    machine_code: str
    name: str
    location_id: int
    firmware_version: str
    status: str
    last_seen_at: datetime | None


class MachineCreateRequest(BaseModel):
    machine_code: str = Field(
        min_length=2,
        max_length=50,
    )

    name: str = Field(
        min_length=2,
        max_length=150,
    )

    location_id: int

    firmware_version: str = Field(
        default="1.0.0",
        max_length=50,
    )

    status: str = Field(
        default="OFFLINE",
        max_length=30,
    )


# ============================================================
# ORDERS
# ============================================================

class OrderItemRequest(BaseModel):
    product_id: int

    quantity: int = Field(
        ge=1,
        le=50,
    )


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(
        min_length=1,
    )

    location_id: int | None = None

    machine_id: int | None = None


class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float


class OrderResponse(BaseModel):
    id: int
    order_number: str
    collection_code: str
    total_amount: float
    status: str
    created_at: datetime
    location_id: int | None = None
    machine_id: int | None = None
    items: list[OrderItemResponse]


# ============================================================
# COLLECTION CODE
# ============================================================

class VerifyCodeRequest(BaseModel):
    code: str = Field(
        pattern=r"^\d{4}$",
    )


class VerifyCodeResponse(BaseModel):
    success: bool
    message: str
    order: OrderResponse | None = None