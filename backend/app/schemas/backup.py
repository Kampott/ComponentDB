from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BackupTypeEnum(str, Enum):
    FULL_PHYSICAL = "full_physical"


class BackupStatusEnum(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    DELETING = "deleting"
    VERIFYING = "verifying"


class ScheduleStateEnum(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"


class CancelBackupResultEnum(str, Enum):
    SUCCESS = "success"
    NOT_FOUND = "not_found"
    ALREADY_FINISHED = "already_finished"


class BackupInfoKindEnum(str, Enum):
    STORE = "store"
    ACTIVE = "active"
    ERROR = "error"


class BackupDatabaseConfigOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    schema_name: str = Field(alias="schema")
    user: str
    host: str
    port: int


class BackupDatabaseConnectionOut(BaseModel):
    pg_version_num: int
    pg_version_string: str
    wal_lsn: str
    db_size_bytes: int
    latency_seconds: float | None = None


class BackupDatabaseOut(BaseModel):
    name: str
    config: BackupDatabaseConfigOut
    connection: BackupDatabaseConnectionOut | None = None


class BackupDatabasesResponse(BaseModel):
    databases: list[BackupDatabaseOut]


class BackupTemplateBase(BaseModel):
    name: str
    description: str
    type: BackupTypeEnum
    include_wal: bool
    checkpoint_timeout: int


class BackupTemplateCreate(BackupTemplateBase):
    pass


class BackupTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: BackupTypeEnum | None = None
    include_wal: bool | None = None
    checkpoint_timeout: int | None = None


class BackupTemplateOut(BackupTemplateBase):
    template_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BackupTemplateListResponse(BaseModel):
    templates: list[BackupTemplateOut]


class StartBackupRequest(BaseModel):
    database_name: str
    template_id: int


class StartBackupResponse(BaseModel):
    backup_id: int


class CancelBackupResponseOut(BaseModel):
    result: CancelBackupResultEnum
    message: str | None = None


class VerifyBackupRequest(BaseModel):
    verify_hash: bool = False


class BackupVerificationOut(BaseModel):
    backup_id: int
    verify_hash: bool
    verified_at: datetime | None = None
    checksum_sha256: str | None = None


class BackupStoreInfoOut(BaseModel):
    size_bytes: int
    original_size_bytes: int
    storage_path: str
    verification: BackupVerificationOut | None = None


class ActiveBackupInfoOut(BaseModel):
    bytes_processed: int
    bytes_total_estimate: int
    files_processed: int
    files_total_estimate: int


class ErrorBackupInfoOut(BaseModel):
    error_message: str


class BackupInfoOut(BaseModel):
    kind: BackupInfoKindEnum
    store_info: BackupStoreInfoOut | None = None
    active_info: ActiveBackupInfoOut | None = None
    error_info: ErrorBackupInfoOut | None = None


class BackupOut(BaseModel):
    backup_id: int
    database_name: str
    backup_template: BackupTemplateOut
    status: BackupStatusEnum
    info: BackupInfoOut | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_seconds: float | None = None
    pg_version_num: int
    parent_backup_id: int | None = None


class BackupListResponse(BaseModel):
    backups: list[BackupOut]


class ScheduleBase(BaseModel):
    database_name: str
    display_name: str
    cron_expression: str
    timezone: str
    template_id: int


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    display_name: str | None = None
    cron_expression: str | None = None
    timezone: str | None = None
    template_id: int | None = None


class ScheduleOut(ScheduleBase):
    schedule_id: int
    state: ScheduleStateEnum
    created_at: datetime | None = None
    updated_at: datetime | None = None
    next_run_at: datetime | None = None
    last_run_at: datetime | None = None
    last_backup_id: int | None = None
    last_run_status: BackupStatusEnum | None = None


class ScheduleListResponse(BaseModel):
    schedules: list[ScheduleOut]
