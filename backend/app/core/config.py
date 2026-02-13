from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    LOG_DATABASE_URL: str
    JWT_ALGORITHM: str

    backend_port: int = 8000
    superuser_email: str
    superuser_password: str
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
