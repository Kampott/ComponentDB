# PostgreSQL prerequisites for pg_backuper

Этот документ описывает, что нужно подготовить в PostgreSQL, чтобы `pg_backuper` мог выполнять physical backup через `pg_basebackup`.

Ниже речь идет именно о physical backup. Для него недостаточно обычного подключения к БД:

- `pg_backuper` запускает `pg_basebackup`
- `pg_basebackup` открывает replication connection
- PostgreSQL должен явно разрешать такую сессию

Если эти условия не выполнены, backup обычно падает с ошибкой вида:

```text
no pg_hba.conf entry for replication connection from host "...", user "...", no encryption
```

## Что именно требуется от PostgreSQL

### 1. Репликационный пользователь

У пользователя должны быть права:

- `LOGIN`
- `REPLICATION`

Минимальный пример:

```sql
CREATE ROLE backuper WITH LOGIN REPLICATION PASSWORD 'change_me';
```

Можно использовать и существующего `postgres`, но это плохая практика:

- слишком широкие права
- сложнее аудит
- сложнее потом ограничивать доступ по `pg_hba.conf`

Предпочтительно заводить отдельную роль только для backup.

### 2. Настройки сервера

Для `pg_basebackup` должны быть корректно выставлены:

- `wal_level = replica` или выше
- `max_wal_senders > 0`
- `listen_addresses` должен позволять подключение с того узла, где работает `pg_backuper`

Проверка:

```sql
SHOW wal_level;
SHOW max_wal_senders;
SHOW listen_addresses;
```

Минимально рабочие значения:

```conf
wal_level = replica
max_wal_senders = 10
listen_addresses = '*'
```

`listen_addresses='*'` не обязателен всегда. Если `pg_backuper` находится на той же машине и подключается по `127.0.0.1`, можно ограничиться локальным bind. Но в большинстве deployment-сценариев backup-сервис живет на другом узле или в другом контейнере, поэтому адрес обычно нужно открыть явно.

### 3. Правило в pg_hba.conf

Это ключевой пункт.

Нужно разрешить именно `replication` connection, а не только обычный доступ к базе.

Пример:

```conf
host replication backuper 10.10.0.15/32 scram-sha-256
```

Структура записи:

- `host`: TCP-подключение
- `replication`: это не имя базы, а специальный тип подключения
- `backuper`: имя роли
- `10.10.0.15/32`: адрес узла, где работает `pg_backuper`
- `scram-sha-256`: рекомендуемый способ аутентификации

Если `pg_backuper` запускается на той же машине и идет через loopback:

```conf
host replication backuper 127.0.0.1/32 scram-sha-256
```

Если сервис живет в docker и ходит в postgres-контейнер из bridge-сети, адрес нужно брать не из головы, а из фактического источника подключения. В локальном smoke это выглядело так:

```text
host "172.19.0.1"
```

Соответственно правило должно было бы выглядеть примерно так:

```conf
host replication backuper 172.19.0.1/32 scram-sha-256
```

## Что менять в pg_backuper

После создания роли и открытия доступа обновите `config.yaml`:

```yaml
databases:
  main:
    schema: main
    user: backuper
    password: change_me
    host: postgres-primary.internal
    port: 5432
```

Важно:

- `user/password` в конфиге `pg_backuper` должны соответствовать роли с правом `REPLICATION`
- `host` должен указывать именно на тот PostgreSQL instance, с которого вы хотите снимать backup

## Пошаговый сценарий для single instance

### Шаг 1. Создать роль

Под суперпользователем PostgreSQL:

```sql
CREATE ROLE backuper WITH LOGIN REPLICATION PASSWORD 'change_me';
```

### Шаг 2. Проверить server settings

```sql
SHOW wal_level;
SHOW max_wal_senders;
SHOW listen_addresses;
```

Если значения не подходят, их надо поменять в `postgresql.conf` или через ваш deployment-механизм.

Пример:

```conf
wal_level = replica
max_wal_senders = 10
listen_addresses = '*'
```

### Шаг 3. Найти pg_hba.conf

```sql
SHOW hba_file;
```

### Шаг 4. Добавить правило

Например:

```conf
host replication backuper 10.10.0.15/32 scram-sha-256
```

### Шаг 5. Перечитать конфигурацию

```sql
SELECT pg_reload_conf();
```

Если вы меняли параметры, которые не подхватываются reload, потребуется restart PostgreSQL.

### Шаг 6. Проверить подключение вручную

С узла `pg_backuper`:

```bash
PGPASSWORD='change_me' pg_basebackup \
  --host 10.10.0.20 \
  --port 5432 \
  --username backuper \
  --pgdata /tmp/pg_backuper_smoke \
  --wal-method none \
  --verbose \
  --progress \
  --no-password
```

Если эта команда не работает, проблема не в `pg_backuper`, а в доступе/настройках PostgreSQL.

## Docker / Compose сценарий

Если PostgreSQL работает в контейнере, есть два частых случая.

### Вариант A. pg_backuper тоже в контейнере той же сети

Тогда в `pg_hba.conf` нужно разрешать адрес или подсеть контейнерной сети, например:

```conf
host replication backuper 172.19.0.0/16 scram-sha-256
```

Лучше по возможности ограничивать правило точнее, чем целая подсеть.

### Вариант B. pg_backuper работает на хосте, PostgreSQL в контейнере

Тогда PostgreSQL видит источник подключения как bridge gateway или адрес хоста в docker-сети. Именно это и произошло в локальном smoke:

```text
172.19.0.1
```

В таком случае нужно:

1. посмотреть фактический адрес в логах PostgreSQL
2. добавить его в `pg_hba.conf`
3. не путать этот адрес с `127.0.0.1`

## Что делать, если PostgreSQL находится в кластере

Здесь важно сначала определить, откуда именно вы хотите снимать backup.

### Базовый принцип

`pg_backuper` должен быть нацелен не в “абстрактный cluster endpoint”, а в конкретный PostgreSQL instance, который допустимо использовать как source для base backup.

Обычно это:

- primary
- или выделенная replica, если ваша архитектура это допускает

### Вариант 1. Backup только с primary

Тогда:

- роль `backuper` создается на primary
- `pg_hba.conf` открывается на primary
- `pg_backuper/config.yaml` указывает на primary
- при failover нужно обновить endpoint или DNS, если primary меняется

На что обратить внимание:

- если у вас VIP / LB / DNS alias на текущий primary, используйте его осознанно
- если endpoint после failover продолжает указывать на старый узел, backup сломается

### Вариант 2. Backup с replica

Это допустимо не во всех инсталляциях одинаково. Нужно проверить вашу политику и ограничения платформы.

В этом случае:

- replication role должна существовать на replica как обычная роль каталога кластера
- `pg_hba.conf` на replica должен разрешать replication connection
- `pg_backuper` должен ходить именно в replica endpoint

Но важно:

- если replica отстает, вы снимаете backup не с самого свежего состояния
- если replica ephemeral и часто переезжает, endpoint должен быть стабильным
- при switchover/failover backup-target может внезапно смениться

### Вариант 3. Управляемый кластер / operator / cloud service

Если вы в Patroni, Stolon, Kubernetes operator, managed PostgreSQL или облачном сервисе:

- не редактируйте `postgresql.conf` и `pg_hba.conf` вручную, если платформа управляет ими декларативно
- внесите изменения тем способом, который ожидает платформа:
  - Helm values
  - CRD / manifest
  - Patroni config
  - cloud parameter group
  - managed service firewall / access rules

Иначе ваши ручные изменения:

- будут перетерты
- не попадут на новый primary после failover
- создадут дрейф между узлами

### Что обязательно проверить в cluster scenario

1. На каком узле реально выполняется `pg_basebackup`
2. Каким endpoint пользуется `pg_backuper`
3. Где именно надо создать роль
4. Где именно надо открыть `pg_hba.conf`
5. Что произойдет после failover
6. Сохранится ли доступ после перевыбора primary

## Рекомендуемая операционная схема для кластера

Практически безопасный минимум:

1. Завести отдельную роль `backuper`
2. Использовать стабильный endpoint, который всегда ведет к корректному backup source
3. Хранить правило доступа не как ручную правку узла, а как часть cluster config
4. После каждого failover иметь smoke-check:
   - `pg_basebackup --wal-method none`
   - или хотя бы тестовое replication connection

## Признаки неправильной настройки

### Ошибка pg_hba

Пример:

```text
no pg_hba.conf entry for replication connection
```

Проблема:

- не открыт replication-доступ для нужного адреса/роли

### Ошибка доступа

Пример:

```text
password authentication failed for user "backuper"
```

Проблема:

- неверный пароль
- неверный auth method
- роль не создана

### Ошибка прав

Пример:

```text
must be superuser or replication role to start walsender
```

Проблема:

- у роли нет `REPLICATION`

### Ошибка маршрутизации в кластере

Симптом:

- вчера backup работал, после failover перестал

Проблема:

- `pg_backuper` смотрит в старый узел
- или новый primary/replica не получил нужные access rules

## Security notes

- не используйте `postgres`, если можно использовать отдельную роль
- ограничивайте адрес источника максимально узко
- не открывайте `host replication all 0.0.0.0/0 ...` без очень веской причины
- предпочитайте `scram-sha-256`, если ваш deployment его поддерживает
- пароль роли backup должен храниться так же аккуратно, как и остальные секреты БД
