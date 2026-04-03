from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    LOG_DATABASE_URL: str = ""
    JWT_ALGORITHM: str = "HS256"
    PG_BACKUPER_GRPC_HOST: str = "localhost"
    PG_BACKUPER_GRPC_PORT: int = 4040
    PG_BACKUPER_GRPC_TARGET: str | None = None
    PG_BACKUPER_GRPC_TIMEOUT_SECONDS: float = 30.0

    backend_port: int = 8000
    secret_key: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow",
    )

    @property
    def pg_backuper_grpc_target(self) -> str:
        if self.PG_BACKUPER_GRPC_TARGET:
            return self.PG_BACKUPER_GRPC_TARGET
        return f"{self.PG_BACKUPER_GRPC_HOST}:{self.PG_BACKUPER_GRPC_PORT}"

settings = Settings()
