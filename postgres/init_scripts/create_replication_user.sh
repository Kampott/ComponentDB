#!/bin/bash
set -e

if [ -z "$POSTGRES_REPLICATION_USER" ] || [ -z "$POSTGRES_REPLICATION_PASSWORD" ]; then
  echo "POSTGRES_REPLICATION_USER or POSTGRES_REPLICATION_PASSWORD not set, skipping replication user creation"
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_REPLICATION_USER}') THEN
            CREATE ROLE ${POSTGRES_REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${POSTGRES_REPLICATION_PASSWORD}';
            RAISE NOTICE 'Role % created', '${POSTGRES_REPLICATION_USER}';
        ELSE
            RAISE NOTICE 'Role % already exists', '${POSTGRES_REPLICATION_USER}';
        END IF;
    END
    \$\$;
EOSQL

HBA_FILE="$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -tA -c "SHOW hba_file;")"

# Добавляем запись, только если её ещё нет
if ! grep -q "host replication ${POSTGRES_REPLICATION_USER}" "$HBA_FILE"; then
    echo "host replication ${POSTGRES_REPLICATION_USER} all scram-sha-256" >> "$HBA_FILE"
    echo "Replication HBA entry added."
else
    echo "Replication HBA entry already exists."
fi

# Перечитываем конфигурацию
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -c "SELECT pg_reload_conf();"

echo "Replication user setup complete."
