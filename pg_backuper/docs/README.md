# Документация

- [Параметры конфигурации](./configuration.md)
- [PlantUML схема БД](./database_schema.puml)
- [PlantUML схема классов программы](./class_diagram.puml)

## Компоненты

Подробные описания классов лежат в подпапке [`compontents`](./compontents/)

## Эксплуатация

- [Подготовка PostgreSQL для physical backup](./postgres_backup_prerequisites.md)

### Backup layer

- [ActiveBackup](./compontents/ActiveBackup.md)
- [ActiveBackupManager](./compontents/ActiveBackupManager.md)
- [BackupCoordinator](./compontents/BackupCoordinator.md)
- [BackupDataStore](./compontents/BackupDataStore.md)
- [FileStorage](./compontents/FileStorage.md)
- [FullPhysicalBackup](./compontents/FullPhysicalBackup.md)
- [LocalFileStorage](./compontents/LocalFileStorage.md)
- [ScheduleManager](./compontents/ScheduleManager.md)
- [SqliteBackupDataStore](./compontents/SqliteBackupDataStore.md)

### gRPC layer

- [BackupGrpcService](./compontents/BackupGrpcService.md)

### Config layer

- [ConfigParser](./compontents/ConfigParser.md)
- [YamlNode](./compontents/YamlNode.md)
- [YamlConfigParser](./compontents/YamlConfigParser.md)

## Что не покрыто отдельно

- Сгенерированные protobuf и gRPC файлы не документируются по отдельности.
- Вспомогательные шаблоны из `Reflect/*` описаны косвенно в документации по конфигурации и YAML parser.
- Тестовые классы не входят в каталог компонентов.
