from pydantic_settings import BaseSettings

class LoggingSettings(BaseSettings):
    LOG_BATCH_SIZE: int = 50
    LOG_FLUSH_INTERVAL: float = 1.0   # seconds
    LOG_MAX_DETAILS_LENGTH: int = 4000  # max JSON length to store
    MASK_KEYS: tuple = ("password", "token", "authorization", "Authorization")

logging_settings = LoggingSettings()
