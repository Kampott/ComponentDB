# BackupDataStore

## Source

- `Source/Backup/BackupDataStore.h`

## Role

`backup::BackupDataStore` задает абстракцию персистентного хранилища.

## Responsibility

- выделять новые `backup_id`
- хранить шаблоны бэкапов
- хранить терминальные backup records
- хранить данные верификации
- хранить расписания

## Main API groups

### ID allocation

- `allocateBackupId()`

### Templates

- `createTemplate()`
- `updateTemplate()`
- `getTemplate()`
- `listTemplates()`
- `deleteTemplate()`

### Backups

- `createBackup()`
- `updateBackup()`
- `getBackup()`
- `listBackups()`
- `deleteBackup()`

### Verification

- `saveVerification()`
- `getVerification()`

### Schedules

- `createSchedule()`
- `updateSchedule()`
- `getSchedule()`
- `listSchedules()`
- `deleteSchedule()`

## Current implementation

В проекте интерфейс реализован классом `backup::SqliteBackupDataStore`.
