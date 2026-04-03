from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import TypeVar

import grpc
from fastapi import HTTPException, status
from google.protobuf import empty_pb2

from app.core.config import settings
from app.integrations.pg_backuper.generated import (
    backup_active_pb2,
    backup_history_pb2,
    backup_pb2_grpc,
    backup_schedule_pb2,
    backup_template_pb2,
)
from app.integrations.pg_backuper.mappers import (
    backup_status_to_proto,
    backup_type_to_proto,
    map_backup,
    map_backup_template,
    map_backup_verification,
    map_cancel_backup_response,
    map_database_info,
    map_schedule,
)
from app.schemas.backup import (
    BackupDatabasesResponse,
    BackupListResponse,
    BackupStatusEnum,
    BackupTemplateCreate,
    BackupTemplateListResponse,
    BackupTemplateOut,
    BackupTemplateUpdate,
    BackupTypeEnum,
    BackupVerificationOut,
    CancelBackupResponseOut,
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleOut,
    ScheduleUpdate,
    StartBackupRequest,
    StartBackupResponse,
)

T = TypeVar("T")


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class PgBackuperService:
    def __init__(self, target: str, timeout_seconds: float) -> None:
        self.target = target
        self.timeout_seconds = timeout_seconds

    async def _call(self, invoker: Callable[[backup_pb2_grpc.BackupServiceStub], Awaitable[T]]) -> T:
        channel = grpc.aio.insecure_channel(self.target)
        try:
            stub = backup_pb2_grpc.BackupServiceStub(channel)
            return await invoker(stub)
        except grpc.aio.AioRpcError as exc:
            raise self._map_rpc_error(exc) from exc
        finally:
            await channel.close()

    @staticmethod
    def _map_rpc_error(exc: grpc.aio.AioRpcError) -> HTTPException:
        raw_details = exc.details() or "pg_backuper request failed"
        details = "".join(ch for ch in raw_details if ch.isprintable() or ch in "\n\t").strip()
        if not details:
            details = "pg_backuper request failed"
        status_map = {
            grpc.StatusCode.INVALID_ARGUMENT: status.HTTP_422_UNPROCESSABLE_ENTITY,
            grpc.StatusCode.NOT_FOUND: status.HTTP_404_NOT_FOUND,
            grpc.StatusCode.ALREADY_EXISTS: status.HTTP_409_CONFLICT,
            grpc.StatusCode.FAILED_PRECONDITION: status.HTTP_409_CONFLICT,
            grpc.StatusCode.PERMISSION_DENIED: status.HTTP_403_FORBIDDEN,
            grpc.StatusCode.UNAUTHENTICATED: status.HTTP_401_UNAUTHORIZED,
            grpc.StatusCode.UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
            grpc.StatusCode.DEADLINE_EXCEEDED: status.HTTP_504_GATEWAY_TIMEOUT,
        }
        return HTTPException(
            status_code=status_map.get(exc.code(), status.HTTP_502_BAD_GATEWAY),
            detail=details,
        )

    async def ping_databases(self) -> BackupDatabasesResponse:
        response = await self._call(
            lambda stub: stub.PingDatabase(
                empty_pb2.Empty(),
                timeout=self.timeout_seconds,
            )
        )
        return BackupDatabasesResponse(
            databases=[map_database_info(item) for item in response.databases]
        )

    async def create_backup_template(self, payload: BackupTemplateCreate) -> BackupTemplateOut:
        request = backup_template_pb2.CreateBackupTemplateRequest(
            name=payload.name,
            description=payload.description,
            type=backup_type_to_proto(payload.type),
            include_wal=payload.include_wal,
            checkpoint_timeout=payload.checkpoint_timeout,
        )
        response = await self._call(
            lambda stub: stub.CreateBackupTemplate(request, timeout=self.timeout_seconds)
        )
        return map_backup_template(response)

    async def list_backup_templates(
        self,
        offset: int | None = None,
        limit: int | None = None,
    ) -> BackupTemplateListResponse:
        request = backup_template_pb2.ListBackupTemplatesRequest()
        if offset is not None:
            request.offset = offset
        if limit is not None:
            request.limit = limit

        response = await self._call(
            lambda stub: stub.ListBackupTemplates(request, timeout=self.timeout_seconds)
        )
        return BackupTemplateListResponse(
            templates=[map_backup_template(item) for item in response.templates]
        )

    async def get_backup_template(self, template_id: int) -> BackupTemplateOut:
        response = await self._call(
            lambda stub: stub.GetBackupTemplate(
                backup_template_pb2.GetBackupTemplateRequest(template_id=template_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_backup_template(response)

    async def update_backup_template(
        self,
        template_id: int,
        payload: BackupTemplateUpdate,
    ) -> BackupTemplateOut:
        current = await self._call(
            lambda stub: stub.GetBackupTemplate(
                backup_template_pb2.GetBackupTemplateRequest(template_id=template_id),
                timeout=self.timeout_seconds,
            )
        )
        request = backup_template_pb2.UpdateBackupTemplateRequest(
            template_id=template_id,
            name=payload.name if payload.name is not None else current.name,
            description=payload.description if payload.description is not None else current.description,
            type=backup_type_to_proto(payload.type) if payload.type is not None else current.type,
            include_wal=payload.include_wal if payload.include_wal is not None else current.include_wal,
            checkpoint_timeout=payload.checkpoint_timeout
            if payload.checkpoint_timeout is not None
            else current.checkpoint_timeout,
        )
        response = await self._call(
            lambda stub: stub.UpdateBackupTemplate(request, timeout=self.timeout_seconds)
        )
        return map_backup_template(response)

    async def delete_backup_template(self, template_id: int) -> None:
        await self._call(
            lambda stub: stub.DeleteBackupTemplate(
                backup_template_pb2.DeleteBackupTemplateRequest(template_id=template_id),
                timeout=self.timeout_seconds,
            )
        )

    async def start_backup(self, payload: StartBackupRequest) -> StartBackupResponse:
        response = await self._call(
            lambda stub: stub.StartBackup(
                backup_active_pb2.StartBackupRequest(
                    database_name=payload.database_name,
                    template_id=payload.template_id,
                ),
                timeout=self.timeout_seconds,
            )
        )
        return StartBackupResponse(backup_id=response.backup_id)

    async def cancel_backup(self, backup_id: int) -> CancelBackupResponseOut:
        response = await self._call(
            lambda stub: stub.CancelBackup(
                backup_active_pb2.CancelBackupRequest(backup_id=backup_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_cancel_backup_response(response)

    async def list_backups(
        self,
        database_name: str | None = None,
        backup_types: list[BackupTypeEnum] | None = None,
        backup_statuses: list[BackupStatusEnum] | None = None,
        only_after: datetime | None = None,
    ) -> BackupListResponse:
        request = backup_history_pb2.ListBackupsRequest()
        if database_name is not None:
            request.database_name = database_name
        if backup_types:
            request.type.extend(backup_type_to_proto(item) for item in backup_types)
        if backup_statuses:
            request.status.extend(backup_status_to_proto(item) for item in backup_statuses)
        if only_after is not None:
            request.only_after.FromDatetime(_ensure_utc(only_after))

        response = await self._call(
            lambda stub: stub.GetBackups(request, timeout=self.timeout_seconds)
        )
        return BackupListResponse(backups=[map_backup(item) for item in response.backups])

    async def get_backup(self, backup_id: int):
        response = await self._call(
            lambda stub: stub.GetBackup(
                backup_history_pb2.GetBackupRequest(backup_id=backup_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_backup(response)

    async def delete_backup(self, backup_id: int, force: bool = False) -> None:
        await self._call(
            lambda stub: stub.DeleteBackup(
                backup_history_pb2.DeleteBackupRequest(
                    backup_id=backup_id,
                    force=force,
                ),
                timeout=self.timeout_seconds,
            )
        )

    async def verify_backup(self, backup_id: int, verify_hash: bool) -> BackupVerificationOut:
        response = await self._call(
            lambda stub: stub.VerifyBackup(
                backup_history_pb2.VerifyBackupRequest(
                    backup_id=backup_id,
                    verify_hash=verify_hash,
                ),
                timeout=self.timeout_seconds,
            )
        )
        return map_backup_verification(response)

    async def create_schedule(self, payload: ScheduleCreate) -> ScheduleOut:
        response = await self._call(
            lambda stub: stub.CreateSchedule(
                backup_schedule_pb2.CreateScheduleRequest(
                    database_name=payload.database_name,
                    display_name=payload.display_name,
                    cron_expression=payload.cron_expression,
                    timezone=payload.timezone,
                    template_id=payload.template_id,
                ),
                timeout=self.timeout_seconds,
            )
        )
        return map_schedule(response)

    async def list_schedules(self, database_name: str | None = None) -> ScheduleListResponse:
        response = await self._call(
            lambda stub: stub.ListSchedules(
                backup_schedule_pb2.ListSchedulesRequest(database_name=database_name or ""),
                timeout=self.timeout_seconds,
            )
        )
        return ScheduleListResponse(schedules=[map_schedule(item) for item in response.schedules])

    async def get_schedule(self, schedule_id: int) -> ScheduleOut:
        response = await self._call(
            lambda stub: stub.GetSchedule(
                backup_schedule_pb2.GetScheduleRequest(schedule_id=schedule_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_schedule(response)

    async def update_schedule(self, schedule_id: int, payload: ScheduleUpdate) -> ScheduleOut:
        current = await self._call(
            lambda stub: stub.GetSchedule(
                backup_schedule_pb2.GetScheduleRequest(schedule_id=schedule_id),
                timeout=self.timeout_seconds,
            )
        )
        request = backup_schedule_pb2.UpdateScheduleRequest(
            schedule_id=schedule_id,
            display_name=payload.display_name if payload.display_name is not None else current.display_name,
            cron_expression=payload.cron_expression
            if payload.cron_expression is not None
            else current.cron_expression,
            timezone=payload.timezone if payload.timezone is not None else current.timezone,
            template_id=payload.template_id if payload.template_id is not None else current.template_id,
        )
        response = await self._call(
            lambda stub: stub.UpdateSchedule(request, timeout=self.timeout_seconds)
        )
        return map_schedule(response)

    async def delete_schedule(self, schedule_id: int) -> None:
        await self._call(
            lambda stub: stub.DeleteSchedule(
                backup_schedule_pb2.DeleteScheduleRequest(schedule_id=schedule_id),
                timeout=self.timeout_seconds,
            )
        )

    async def pause_schedule(self, schedule_id: int) -> ScheduleOut:
        response = await self._call(
            lambda stub: stub.PauseSchedule(
                backup_schedule_pb2.PauseScheduleRequest(schedule_id=schedule_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_schedule(response)

    async def resume_schedule(self, schedule_id: int) -> ScheduleOut:
        response = await self._call(
            lambda stub: stub.ResumeSchedule(
                backup_schedule_pb2.ResumeScheduleRequest(schedule_id=schedule_id),
                timeout=self.timeout_seconds,
            )
        )
        return map_schedule(response)


def get_pg_backuper_service() -> PgBackuperService:
    return PgBackuperService(
        target=settings.pg_backuper_grpc_target,
        timeout_seconds=settings.PG_BACKUPER_GRPC_TIMEOUT_SECONDS,
    )
