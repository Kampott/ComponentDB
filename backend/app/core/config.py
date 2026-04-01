from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    LOG_DATABASE_URL: str = ""
    JWT_ALGORITHM: str = "HS256"

    backend_port: int = 8000
    secret_key: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow",
    )

settings = Settings()
