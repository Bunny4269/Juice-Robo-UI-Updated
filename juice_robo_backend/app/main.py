from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine, SessionLocal
from .models import (
    Location,
    Machine,
    Product,
)
from .routes import (
    auth,
    locations,
    machines,
    orders,
    payments,
    products,
    profile,
)

settings = get_settings()


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(locations.router)
app.include_router(machines.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():

    Base.metadata.create_all(
        bind=engine
    )

    seed_locations()
    seed_machines()
    seed_products()


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {
        "success": True,
        "service": "Juice Robo API",
    }


# ============================================================
# SEED LOCATIONS
# ============================================================

def seed_locations():

    db = SessionLocal()

    try:

        if db.query(Location).count() > 0:
            return

        db.add_all([

            Location(
                name="NGE Agromate",
                address="Hyderabad",
                is_active=True,
            ),

            Location(
                name="Woxsen University",
                address="Hyderabad, Telangana",
                is_active=True,
            ),

            Location(
                name="Juice Robo HQ",
                address="Hyderabad, Telangana",
                is_active=True,
            ),

        ])

        db.commit()

    finally:

        db.close()


# ============================================================
# SEED MACHINES
# ============================================================

def seed_machines():

    db = SessionLocal()

    try:

        if db.query(Machine).count() > 0:
            return

        locations = (
            db.query(Location)
            .order_by(Location.id)
            .all()
        )

        if not locations:
            return

        machines = []

        for index, location in enumerate(
            locations,
            start=1,
        ):

            machines.append(
                Machine(
                    machine_code=f"JR-{index:03d}",
                    name=f"Juice Robo {index}",
                    location_id=location.id,
                    firmware_version="1.0.0",
                    status="ONLINE",
                )
            )

        db.add_all(machines)

        db.commit()

    finally:

        db.close()

# ============================================================
# SEED PRODUCTS
# ============================================================

def seed_products():

    db = SessionLocal()

    try:

        if db.query(Product).count() > 0:
            return

        db.add_all([

            Product(
                name="Plain Sugarcane Juice",
                description="Fresh sugarcane juice.",
                price=50,
                image_url="/order_now/assets/plain-juice.jpg",
            ),

            Product(
                name="Lemon Sugarcane Juice",
                description="Fresh sugarcane juice with lemon.",
                price=60,
                image_url="/assets/lemon-juice.jpg",
            ),

            Product(
                name="Ginger Sugarcane Juice",
                description="Fresh sugarcane juice with ginger.",
                price=60,
                image_url="/assets/ginger-juice.jpg",
            ),

            Product(
                name="Ginger + Lemon Sugarcane Juice",
                description=(
                    "Fresh sugarcane juice with "
                    "ginger and lemon."
                ),
                price=70,
                image_url="/assets/ginger-lemon-juice.jpg",
            ),

        ])

        db.commit()

    finally:

        db.close()