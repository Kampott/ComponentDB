from datetime import datetime, timezone

from app.integrations.pg_backuper.generated import (
    backup_active_pb2,
    backup_common_pb2,
    backup_database_pb2,
    backup_history_pb2,
    backup_schedule_pb2,
    backup_template_pb2,
)
from app.schemas.backup import (
    ActiveBackupInfoOut,
    BackupDatabaseConfigOut,
    BackupDatabaseConnectionOut,
    BackupDatabaseOut,
    BackupInfoKindEnum,
    BackupInfoOut,
    BackupOut,
    BackupStatusEnum,
    BackupStoreInfoOut,
    BackupTemplateOut,
    BackupTypeEnum,
    BackupVerificationOut,
    CancelBackupResponseOut,
    CancelBackupResultEnum,
    ErrorBackupInfoOut,
    ScheduleOut,
    ScheduleStateEnum,
)


BACKUP_TYPE_TO_PROTO: dict[BackupTypeEnum, int] = {
    BackupTypeEnum.FULL_PHYSICAL: backup_common_pb2.BACKUP_TYPE_FULL_PHYSICAL,
}

BACKUP_TYPE_FROM_PROTO: dict[int, BackupTypeEnum] = {
    value: key for key, value in BACKUP_TYPE_TO_PROTO.items()
}

BACKUP_STATUS_FROM_PROTO: dict[int, BackupStatusEnum] = {
    backup_common_pb2.BACKUP_STATUS_QUEUED: BackupStatusEnum.QUEUED,
    backup_common_pb2.BACKUP_STATUS_RUNNING: BackupStatusEnum.RUNNING,
    backup_common_pb2.BACKUP_STATUS_COMPLETED: BackupStatusEnum.COMPLETED,
    backup_common_pb2.BACKUP_STATUS_FAILED: BackupStatusEnum.FAILED,
    backup_common_pb2.BACKUP_STATUS_CANCELLED: BackupStatusEnum.CANCELLED,
    backup_common_pb2.BACKUP_STATUS_DELETING: BackupStatusEnum.DELETING,
    backup_common_pb2.BACKUP_STATUS_VERIFYING: BackupStatusEnum.VERIFYING,
}

BACKUP_STATUS_TO_PROTO: dict[BackupStatusEnum, int] = {
    value: key for key, value in BACKUP_STATUS_FROM_PROTO.items()
}

SCHEDULE_STATE_FROM_PROTO: dict[int, ScheduleStateEnum] = {
    backup_common_pb2.SCHEDULE_STATE_ACTIVE: ScheduleStateEnum.ACTIVE,
    backup_common_pb2.SCHEDULE_STATE_PAUSED: ScheduleStateEnum.PAUSED,
}

CANCEL_RESULT_FROM_PROTO: dict[int, CancelBackupResultEnum] = {
    backup_active_pb2.CANCEL_RESULT_SUCCESS: CancelBackupResultEnum.SUCCESS,
    backup_active_pb2.CANCEL_RESULT_NOT_FOUND: CancelBackupResultEnum.NOT_FOUND,
    backup_active_pb2.CANCEL_RESULT_ALREADY_FINISHED: CancelBackupResultEnum.ALREADY_FINISHED,
}


def backup_type_to_proto(value: BackupTypeEnum) -> int:
    return BACKUP_TYPE_TO_PROTO[value]


def backup_status_to_proto(value: BackupStatusEnum) -> int:
    return BACKUP_STATUS_TO_PROTO[value]


def _timestamp_to_datetime(value) -> datetime | None:
    if value is None or (value.seconds == 0 and value.nanos == 0):
        return None
    return value.ToDatetime(timezone.utc)


def _duration_to_seconds(value) -> float | None:
    if value is None or (value.seconds == 0 and value.nanos == 0):
        return None
    return value.ToTimedelta().total_seconds()


def _has_field(message, field_name: str) -> bool:
    try:
        return message.HasField(field_name)
    except ValueError:
        return False


def map_database_info(message: backup_database_pb2.DatabaseInfo) -> BackupDatabaseOut:
    connection = None
    if _has_field(message, "connection"):
        connection = BackupDatabaseConnectionOut(
            pg_version_num=message.connection.pg_version_num,
            pg_version_string=message.connection.pg_version_string,
            wal_lsn=message.connection.wal_lsn,
            db_size_bytes=message.connection.db_size_bytes,
            latency_seconds=_duration_to_seconds(message.connection.latency),
        )

    return BackupDatabaseOut(
        name=message.name,
        config=BackupDatabaseConfigOut(
            schema_name=message.config.schema,
            user=message.config.user,
            host=message.config.host,
            port=message.config.port,
        ),
        connection=connection,
    )


def map_backup_template(message: backup_template_pb2.BackupTemplate) -> BackupTemplateOut:
    return BackupTemplateOut(
        template_id=message.template_id,
        name=message.name,
        description=message.description,
        type=BACKUP_TYPE_FROM_PROTO[message.type],
        include_wal=message.include_wal,
        checkpoint_timeout=message.checkpoint_timeout,
        created_at=_timestamp_to_datetime(message.created_at),
        updated_at=_timestamp_to_datetime(message.updated_at),
    )


def map_backup_verification(message: backup_history_pb2.BackupVerification) -> BackupVerificationOut:
    return BackupVerificationOut(
        backup_id=message.backup_id,
        verify_hash=message.verify_hash,
        verified_at=_timestamp_to_datetime(message.verified_at) if _has_field(message, "verified_at") else None,
        checksum_sha256=message.checksum_sha256 if _has_field(message, "checksum_sha256") else None,
    )


def map_backup_info(message: backup_history_pb2.BackupAdditionalInfo) -> BackupInfoOut | None:
    data_type = message.WhichOneof("data_type")
    if data_type == "store_info":
        return BackupInfoOut(
            kind=BackupInfoKindEnum.STORE,
            store_info=BackupStoreInfoOut(
                size_bytes=message.store_info.size_bytes,
                original_size_bytes=message.store_info.original_size_bytes,
                storage_path=message.store_info.storage_path,
                verification=map_backup_verification(message.store_info.verification)
                if _has_field(message.store_info, "verification")
                else None,
            ),
        )
    if data_type == "active_info":
        return BackupInfoOut(
            kind=BackupInfoKindEnum.ACTIVE,
            active_info=ActiveBackupInfoOut(
                bytes_processed=message.active_info.bytes_processed,
                bytes_total_estimate=message.active_info.bytes_total_estimate,
                files_processed=message.active_info.files_processed,
                files_total_estimate=message.active_info.files_total_estimate,
            ),
        )
    if data_type == "error_info":
        return BackupInfoOut(
            kind=BackupInfoKindEnum.ERROR,
            error_info=ErrorBackupInfoOut(
                error_message=message.error_info.error_message,
            ),
        )
    return None


def map_backup(message: backup_history_pb2.Backup) -> BackupOut:
    return BackupOut(
        backup_id=message.backup_id,
        database_name=message.database_name,
        backup_template=map_backup_template(message.backup_template),
        status=BACKUP_STATUS_FROM_PROTO[message.status],
        info=map_backup_info(message.info),
        started_at=_timestamp_to_datetime(message.started_at),
        finished_at=_timestamp_to_datetime(message.finished_at),
        duration_seconds=_duration_to_seconds(message.duration),
        pg_version_num=message.pg_version_num,
        parent_backup_id=message.parent_backup_id if _has_field(message, "parent_backup_id") else None,
    )


def map_schedule(message: backup_schedule_pb2.Schedule) -> ScheduleOut:
    last_backup_id = message.last_backup_id or None
    last_run_at = _timestamp_to_datetime(message.last_run_at)

    return ScheduleOut(
        schedule_id=message.schedule_id,
        database_name=message.database_name,
        display_name=message.display_name,
        cron_expression=message.cron_expression,
        timezone=message.timezone,
        state=SCHEDULE_STATE_FROM_PROTO[message.state],
        template_id=message.template_id,
        created_at=_timestamp_to_datetime(message.created_at),
        updated_at=_timestamp_to_datetime(message.updated_at),
        next_run_at=_timestamp_to_datetime(message.next_run_at),
        last_run_at=last_run_at,
        last_backup_id=last_backup_id,
        last_run_status=BACKUP_STATUS_FROM_PROTO[message.last_run_status]
        if last_backup_id is not None or last_run_at is not None
        else None,
    )


def map_cancel_backup_response(message: backup_active_pb2.CancelBackupResponse) -> CancelBackupResponseOut:
    return CancelBackupResponseOut(
        result=CANCEL_RESULT_FROM_PROTO[message.result],
        message=message.message if _has_field(message, "message") else None,
    )
