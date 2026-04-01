# ActiveBackup

## Source

- `Source/Backup/ActiveBackup.h`

## Role

`backup::ActiveBackup` задает единый интерфейс для любого бэкапа, который сейчас живет в памяти и исполняется асинхронно.

## Responsibility

- выдать стабильный `backup_id`
- запуститься и отмениться
- отдать текущий статус и прогресс
- отдать снапшот для API слоя

## Main API

- `id()`
- `start()`
- `cancel()`
- `status()`
- `progress()`
- `snapshot()`

## Related data structures

- `BackupProgress`: счетчики обработки байтов и файлов
- `CompletedBackupData`: итоговые данные успешного завершения
- `ActiveBackupEvents`: callbacks для completed/failed/cancelled/progress
- `ActiveBackupSnapshotData`: сериализуемый снимок активного бэкапа

## Main implementation

Основная реализация интерфейса в проекте: `backup::FullPhysicalBackup`.
