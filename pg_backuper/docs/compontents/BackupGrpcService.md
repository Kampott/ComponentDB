# BackupGrpcService

## Source

- `Source/Grpc/BackupGrpcService.h`
- `Source/Grpc/BackupGrpcService.cpp`

## Role

`BackupGrpcService` является внешним gRPC facade слоем сервиса.

## Responsibility

- реализовать protobuf API `pgbackup.v1.BackupService`
- маппить внутренние C++ модели в protobuf messages
- объединять active backups из памяти и terminal backups из БД
- валидировать preconditions для delete/verify операций

## Main dependencies

- `BackupDataStore`
- `BackupCoordinator`
- `ActiveBackupManager`
- `ScheduleManager`
- `FileStorage`
- `std::map<std::string, config::DatabaseSettings>`

## Backup-specific behavior

- `StartBackup()` делегирует запуск в `BackupCoordinator`.
- `CancelBackup()` работает только через `ActiveBackupManager`.
- `GetBackups()` объединяет:
  - активные бэкапы из памяти
  - терминальные бэкапы из БД
- `GetBackup()` сначала ищет active backup, потом fallback в БД.
- `DeleteBackup()` запрещает удаление active backup.
- `DeleteBackupTemplate()` запрещает удаление шаблона, если на него ссылается:
  - active backup
  - history backup
  - schedule
- `VerifyBackup()` запрещает верификацию active backup и требует `storage_path`.

## Mapping

Класс содержит private converters:

- `toProto(BackupTemplateRecord)`
- `toProto(BackupRecord)`
- `toProto(ActiveBackupSnapshotData)`
- `toProto(BackupVerificationRecord)`
- `toProto(ScheduleRecord)`
- `toFilter(ListBackupsRequest)`

## Notes

- Для успешных бэкапов protobuf поле `info.store_info` заполняется из БД.
- Для активных бэкапов protobuf поле `info.active_info` собирается из snapshot.
- Для failed/cancelled бэкапов используется `info.error_info`.
