from functools import lru_cache

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):

    # ========================================================
    # APPLICATION
    # ========================================================

    app_name: str = "Juice Robo API"

    # ========================================================
    # DATABASE
    # ========================================================

    database_url: str = "sqlite:///./juice_robo.db"

    # ========================================================
    # JWT
    # ========================================================

    jwt_secret: str

    jwt_expire_minutes: int = 1440

    # ========================================================
    # RAZORPAY
    # ========================================================

    razorpay_key_id: str = ""

    razorpay_key_secret: str = ""

    # ========================================================
    # CORS
    # ========================================================

    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5500,"
        "http://127.0.0.1:5500"
    )

    # ========================================================
    # ADMIN
    # ========================================================

    admin_email: str = "admin@juicerobo.com"

    # ========================================================
    # PYDANTIC SETTINGS
    # ========================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ========================================================
    # CORS LIST
    # ========================================================

    @property
    def cors_origin_list(self) -> list[str]:

        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


# ============================================================
# SETTINGS SINGLETON
# ============================================================

@lru_cache
def get_settings() -> Settings:

    return Settings()