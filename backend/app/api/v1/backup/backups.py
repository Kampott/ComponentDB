from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.security import get_current_user
from app.integrations.pg_backuper.service import PgBackuperService, get_pg_backuper_service
from app.models.auth import User
from app.schemas.backup import (
    BackupDatabasesResponse,
    BackupListResponse,
    BackupOut,
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
    VerifyBackupRequest,
)

router = APIRouter(tags=["Backup"])


@router.get("/backup/databases", response_model=BackupDatabasesResponse)
async def list_backup_databases(
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.ping_databases()


@router.post(
    "/backup/templates",
    response_model=BackupTemplateOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_backup_template(
    payload: BackupTemplateCreate,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.create_backup_template(payload)


@router.get("/backup/templates", response_model=BackupTemplateListResponse)
async def list_backup_templates(
    offset: int | None = Query(None, ge=0),
    limit: int | None = Query(None, ge=1),
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.list_backup_templates(offset=offset, limit=limit)


@router.get("/backup/templates/{template_id}", response_model=BackupTemplateOut)
async def get_backup_template(
    template_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.get_backup_template(template_id)


@router.patch("/backup/templates/{template_id}", response_model=BackupTemplateOut)
async def update_backup_template(
    template_id: int,
    payload: BackupTemplateUpdate,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.update_backup_template(template_id, payload)


@router.delete("/backup/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup_template(
    template_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    await service.delete_backup_template(template_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/backups", response_model=StartBackupResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_backup(
    payload: StartBackupRequest,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.start_backup(payload)


@router.get("/backups", response_model=BackupListResponse)
async def list_backups(
    database_name: str | None = Query(None),
    backup_type: list[BackupTypeEnum] | None = Query(None, alias="type"),
    backup_status: list[BackupStatusEnum] | None = Query(None, alias="status"),
    only_after: datetime | None = Query(None),
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.list_backups(
        database_name=database_name,
        backup_types=backup_type,
        backup_statuses=backup_status,
        only_after=only_after,
    )


@router.get("/backups/{backup_id}", response_model=BackupOut)
async def get_backup(
    backup_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.get_backup(backup_id)


@router.delete("/backups/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: int,
    force: bool = Query(False),
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    await service.delete_backup(backup_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/backups/{backup_id}/cancel", response_model=CancelBackupResponseOut)
async def cancel_backup(
    backup_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.cancel_backup(backup_id)


@router.post("/backups/{backup_id}/verify", response_model=BackupVerificationOut)
async def verify_backup(
    backup_id: int,
    payload: VerifyBackupRequest,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.verify_backup(backup_id, verify_hash=payload.verify_hash)


@router.post(
    "/backup/schedules",
    response_model=ScheduleOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_schedule(
    payload: ScheduleCreate,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.create_schedule(payload)


@router.get("/backup/schedules", response_model=ScheduleListResponse)
async def list_schedules(
    database_name: str | None = Query(None),
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.list_schedules(database_name=database_name)


@router.get("/backup/schedules/{schedule_id}", response_model=ScheduleOut)
async def get_schedule(
    schedule_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.get_schedule(schedule_id)


@router.patch("/backup/schedules/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(
    schedule_id: int,
    payload: ScheduleUpdate,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.update_schedule(schedule_id, payload)


@router.delete("/backup/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    await service.delete_schedule(schedule_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/backup/schedules/{schedule_id}/pause", response_model=ScheduleOut)
async def pause_schedule(
    schedule_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.pause_schedule(schedule_id)


@router.post("/backup/schedules/{schedule_id}/resume", response_model=ScheduleOut)
async def resume_schedule(
    schedule_id: int,
    _: User = Depends(get_current_user),
    service: PgBackuperService = Depends(get_pg_backuper_service),
):
    return await service.resume_schedule(schedule_id)
