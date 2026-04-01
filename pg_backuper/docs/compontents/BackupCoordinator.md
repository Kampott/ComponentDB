# BackupCoordinator

## Source

- `Source/Backup/BackupCoordinator.h`
- `Source/Backup/BackupCoordinator.cpp`

## Role

`backup::BackupCoordinator` оркестрирует запуск нового бэкапа и перевод его терминального состояния в постоянное хранение.

## Responsibility

- проверить существование целевой БД и шаблона
- запросить новый `backup_id` у `BackupDataStore`
- создать `FullPhysicalBackup`
- зарегистрировать его в `ActiveBackupManager`
- на completed/failed/cancelled сохранить терминальный результат в БД
- обновить runtime-поля расписания, если запуск пришел из schedule

## Main method

- `startBackup(databaseName, templateId, scheduleId)`

## Collaboration

- `BackupDataStore`: выделение id и запись терминальных backup records
- `ActiveBackupManager`: регистрация активного инстанса
- `FileStorage`: рабочие и финальные пути
- `FullPhysicalBackup`: фактическое выполнение `pg_basebackup`
- `ScheduleManager`: передает `scheduleId` в scheduled runs

## Important behavior

- `backup_id` выделяется до старта процесса и сохраняется за бэкапом на всем жизненном цикле.
- В БД пишется только терминальное состояние.
- Для successful backup координатор сохраняет `storagePath`, размеры и `pgVersionNum`.
- Для failed/cancelled backup координатор сохраняет ошибку или факт отмены с тем же `backup_id`.
