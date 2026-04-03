# Configuration

Конфигурация сервиса хранится в YAML-файле и парсится через `YamlConfigParser<config::Config>`.

Источник структуры:

- `Source/Config/Config.h`
- `Source/Config/Parsers/YamlConfigParser.h`
- `config.example.yaml`

## Важное поведение

- Все поля конфигурации сейчас считаются обязательными.
- Значения по умолчанию, заданные в `config::BackupRuntimeSettings`, не подставляются, если секция или поле отсутствуют в YAML.
- Ошибка в любом поле прерывает загрузку конфигурации целиком.

## Общая структура YAML

```yaml
grpc:
  host: 0.0.0.0
  port: 4040

backup:
  sqlitePath: data/backups.sqlite
  storageRoot: data/storage
  pgBasebackupPath: pg_basebackup

databases:
  main:
    schema: main
    user: postgres
    password: postgres
    host: localhost
    port: 5432
```

## Секция `grpc`

Источник: `config::GrpcSettings`

| Поле | Тип | Назначение |
| --- | --- | --- |
| `host` | `string` | Адрес, на котором gRPC сервер будет принимать подключения |
| `port` | `uint16` | TCP порт gRPC сервера |

Пример:

```yaml
grpc:
  host: 0.0.0.0
  port: 4040
```

## Секция `backup`

Источник: `config::BackupRuntimeSettings`

| Поле | Тип | Назначение |
| --- | --- | --- |
| `sqlitePath` | `string` | Путь к SQLite базе с шаблонами, терминальными бэкапами, верификациями и расписаниями |
| `storageRoot` | `string` | Корень файлового хранилища бэкапов; внутри создаются рабочие и финальные директории |
| `pgBasebackupPath` | `string` | Путь до исполняемого файла `pg_basebackup` |

Пример:

```yaml
backup:
  sqlitePath: data/backups.sqlite
  storageRoot: data/storage
  pgBasebackupPath: pg_basebackup
```

## Секция `databases`

Источник: `std::map<std::string, config::DatabaseSettings>`

Ключ верхнего уровня в `databases` становится логическим именем БД внутри сервиса и API.

### Поля записи базы данных

Источник: `config::DatabaseSettings`

| Поле | Тип | Назначение |
| --- | --- | --- |
| `schema` | `string` | Имя схемы или логическое имя БД в конфиге |
| `user` | `string` | Пользователь PostgreSQL |
| `password` | `string` | Пароль PostgreSQL |
| `host` | `string` | Хост PostgreSQL |
| `port` | `uint16` | Порт PostgreSQL |

Пример:

```yaml
databases:
  main:
    schema: main
    user: postgres
    password: postgres
    host: localhost
    port: 5432

  logging:
    schema: logging
    user: postgres
    password: postgres
    host: localhost
    port: 5431
```

## Как конфигурация используется в рантайме

1. `main.cpp` выбирает путь к YAML-файлу.
2. `YamlConfigParser<config::Config>` загружает YAML и рекурсивно превращает его в `config::Config`.
3. На основе `backup.*` создаются `SqliteBackupDataStore` и `LocalFileStorage`.
4. На основе `databases` создаются `BackupCoordinator` и `BackupGrpcService`.
5. На основе `grpc.*` поднимается gRPC сервер.

## Типовые ошибки конфигурации

- Отсутствует обязательное поле: будет ошибка вида `Missing required field '...'`.
- Неверный тип скаляра: будет ошибка вида `Scalar parse error: ...`.
- Не найден файл YAML: будет ошибка `Could not open '...': ...`.
- Некорректный YAML: будет ошибка `YAML syntax error in '...': ...`.

## Требования к PostgreSQL для physical backup

Поля `databases.*` задают не просто обычный SQL-доступ.

Для physical backup через `pg_basebackup` PostgreSQL должен:

- принимать replication connection
- иметь роль с правом `REPLICATION`
- разрешать источник подключения в `pg_hba.conf`

Подробный пошаговый документ:

- [`postgres_backup_prerequisites.md`](./postgres_backup_prerequisites.md)
