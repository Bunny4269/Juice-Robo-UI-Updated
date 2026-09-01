from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    LoginRequest,
    RegisterRequest,
)
from ..security import (
    create_access_token,
    hash_password,
    verify_password,
)
from ..user_excel_service import (
    save_user_credentials,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# HELPERS
# ============================================================

def normalize_phone(
    phone: str,
) -> str:
    """
    Normalize a phone number to digits only.
    """

    return "".join(
        character
        for character in str(phone or "")
        if character.isdigit()
    )


def normalize_email(
    email: str,
) -> str:
    """
    Normalize an email address.
    """

    return str(
        email or ""
    ).strip().lower()


# ============================================================
# REGISTER NEW LOCAL USER
# ============================================================

@router.post(
    "/register"
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new Juice Robo development user.

    Registration flow:

        React
          ↓
        FastAPI
          ↓
        SQLite
          ↓
        users.xlsx

    Database:
        password is HASHED.

    Development Excel:
        password is stored PLAINTEXT,
        as explicitly requested.

    Registration does NOT automatically log the user in.
    """

    # --------------------------------------------------------
    # READ + NORMALIZE INPUT
    # --------------------------------------------------------

    name = str(
        payload.name
    ).strip()

    email = normalize_email(
        payload.identifier
    )

    phone = normalize_phone(
        payload.phone
    )

    password = str(
        payload.password
    )


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required.",
        )

    if len(phone) != 10:
        raise HTTPException(
            status_code=400,
            detail=(
                "Enter a valid 10-digit phone number."
            ),
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least 6 characters."
            ),
        )


    # --------------------------------------------------------
    # CHECK DUPLICATE EMAIL OR PHONE
    # --------------------------------------------------------

    existing_user = db.scalar(
        select(User).where(
            or_(
                User.email == email,
                User.phone == phone,
            )
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this email or phone "
                "number already exists."
            ),
        )


    # --------------------------------------------------------
    # CREATE DATABASE USER
    # --------------------------------------------------------

    user = User(
        name=name,
        email=email,
        phone=phone,

        # IMPORTANT:
        # SQLite stores ONLY the hashed password.
        password_hash=hash_password(
            password
        ),

        is_admin=False,
    )

    db.add(
        user
    )

    db.commit()

    db.refresh(
        user
    )


    # --------------------------------------------------------
    # SAVE USER TO DEVELOPMENT EXCEL
    # --------------------------------------------------------

    try:

        save_user_credentials(
            user_id=user.id,

            name=user.name,

            email=user.email,

            phone=user.phone,

            # DEVELOPMENT ONLY:
            # Store plaintext password in users.xlsx.
            password=password,

            is_admin=bool(
                user.is_admin
            ),

            status="ACTIVE",

            created_at=user.created_at,
        )

        print(
            "[Juice Robo] User saved to users.xlsx:",
            user.id,
        )

    except Exception as excel_error:

        print(
            "[Juice Robo] Excel save failed:",
            repr(
                excel_error
            ),
        )


    # --------------------------------------------------------
    # REGISTRATION SUCCESS
    # --------------------------------------------------------

    return {
        "success": True,

        "message":
            "Account created successfully.",

        "user": {
            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "phone":
                user.phone,

            "is_admin":
                bool(
                    user.is_admin
                ),

            "created_at":
                user.created_at,
        },
    }


# ============================================================
# LOGIN LOCAL USER
# ============================================================

@router.post(
    "/login"
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login a locally created Juice Robo development user.

    The identifier can be:

        Email
        OR
        Phone number

    Password verification is performed against the hashed
    password stored in SQLite.

    users.xlsx is NOT used for authentication.
    """

    # --------------------------------------------------------
    # READ INPUT
    # --------------------------------------------------------

    identifier = str(
        payload.identifier
    ).strip()

    password = str(
        payload.password
    )


    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    if not identifier:
        raise HTTPException(
            status_code=400,
            detail=(
                "Enter your email address or phone number."
            ),
        )

    if not password:
        raise HTTPException(
            status_code=400,
            detail="Enter your password.",
        )


    # --------------------------------------------------------
    # NORMALIZE IDENTIFIER
    # --------------------------------------------------------

    normalized_email = normalize_email(
        identifier
    )

    normalized_phone = normalize_phone(
        identifier
    )


    # --------------------------------------------------------
    # FIND LOCAL USER
    # --------------------------------------------------------

    user = db.scalar(
        select(User).where(
            or_(
                User.email == normalized_email,
                User.phone == normalized_phone,
            )
        )
    )


    # --------------------------------------------------------
    # VERIFY PASSWORD
    # --------------------------------------------------------

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials.",
        )


    password_valid = verify_password(
        password,
        user.password_hash,
    )


    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials.",
        )


    # --------------------------------------------------------
    # CREATE ACCESS TOKEN
    # --------------------------------------------------------

    access_token = create_access_token(
        user
    )


    # --------------------------------------------------------
    # LOGIN SUCCESS
    # --------------------------------------------------------

    print(
        "[Juice Robo] Local user login successful:",
        user.id,
    )


    return {
        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user": {
            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "phone":
                user.phone,

            "is_admin":
                bool(
                    user.is_admin
                ),

            "created_at":
                user.created_at,
        },
    }