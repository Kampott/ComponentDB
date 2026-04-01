#include "SqliteBackupDataStore.h"

#include <sqlite3.h>

#include <format>
#include <stdexcept>

namespace backup {

namespace {

int64_t toUnix(TimePoint tp) { return std::chrono::duration_cast<std::chrono::seconds>(tp.time_since_epoch()).count(); }

TimePoint fromUnix(int64_t seconds) { return TimePoint{std::chrono::seconds{seconds}}; }

std::optional<int64_t> optToUnix(const std::optional<TimePoint>& tp) {
    return tp ? std::optional{toUnix(*tp)} : std::nullopt;
}

std::string notFoundMessage(std::string_view entityName, int64_t id) {
    return std::format("{} {} not found", entityName, id);
}

bool isSuccessStatus(BackupStatus status) { return status == BackupStatus::Completed; }

bool isFailureStatus(BackupStatus status) {
    return status == BackupStatus::Failed || status == BackupStatus::Cancelled;
}

class SqlStatement {
public:
    SqlStatement(sqlite3* database, std::string_view rawSql) : m_database{database} {
        const int rc =
            sqlite3_prepare_v2(database, rawSql.data(), static_cast<int>(rawSql.size()), &m_statement, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error{std::format("sqlite3_prepare_v2: {}", sqlite3_errmsg(database))};
        }
    }

    ~SqlStatement() { sqlite3_finalize(m_statement); }

    SqlStatement(const SqlStatement&) = delete;
    SqlStatement& operator=(const SqlStatement&) = delete;

    SqlStatement& bindInt64(int i, std::int64_t v) {
        if (sqlite3_bind_int64(m_statement, i, v) != SQLITE_OK) throw err("bind_int64");
        return *this;
    }

    SqlStatement& bindText(int i, std::string_view v) {
        if (sqlite3_bind_text(m_statement, i, v.data(), static_cast<int>(v.size()), SQLITE_TRANSIENT) != SQLITE_OK)
            throw err("bind_text");
        return *this;
    }

    SqlStatement& bindNull(int i) {
        if (sqlite3_bind_null(m_statement, i) != SQLITE_OK) throw err("bind_null");
        return *this;
    }

    SqlStatement& bindOptInt64(int i, std::optional<std::int64_t> v) { return v ? bindInt64(i, *v) : bindNull(i); }

    SqlStatement& bindOptText(int i, const std::optional<std::string>& v) { return v ? bindText(i, *v) : bindNull(i); }

    bool step() {
        const int rc = sqlite3_step(m_statement);
        if (rc == SQLITE_ROW) {
            return true;
        }
        if (rc == SQLITE_DONE) {
            return false;
        }
        throw err("step");
    }

    std::int64_t colInt64(int i) const { return sqlite3_column_int64(m_statement, i); }
    std::string colText(int i) const {
        const auto* p = reinterpret_cast<const char*>(sqlite3_column_text(m_statement, i));
        return p ? p : "";
    }
    bool colNull(int i) const { return sqlite3_column_type(m_statement, i) == SQLITE_NULL; }

    std::optional<int64_t> colOptInt64(int i) const { return colNull(i) ? std::nullopt : std::optional{colInt64(i)}; }
    std::optional<std::string> colOptText(int i) const { return colNull(i) ? std::nullopt : std::optional{colText(i)}; }

private:
    std::runtime_error err(std::string_view op) const {
        return std::runtime_error{std::format("sqlite3_{}: {}", op, sqlite3_errmsg(m_database))};
    }

    sqlite3* m_database;
    sqlite3_stmt* m_statement{nullptr};
};

class SqlTransaction {
public:
    explicit SqlTransaction(sqlite3* database) : m_database{database} { exec("BEGIN IMMEDIATE"); }

    ~SqlTransaction() {
        if (!m_committed) {
            sqlite3_exec(m_database, "ROLLBACK", nullptr, nullptr, nullptr);
        }
    }

    SqlTransaction(const SqlTransaction&) = delete;
    SqlTransaction& operator=(const SqlTransaction&) = delete;

    void commit() {
        exec("COMMIT");
        m_committed = true;
    }

private:
    void exec(const char* sql) {
        char* errorMessage = nullptr;
        const int rc = sqlite3_exec(m_database, sql, nullptr, nullptr, &errorMessage);
        if (rc != SQLITE_OK) {
            const std::string error = errorMessage ? errorMessage : "unknown";
            sqlite3_free(errorMessage);
            throw std::runtime_error{std::format("sqlite3_exec({}): {}", sql, error)};
        }
    }

    sqlite3* m_database;
    bool m_committed{false};
};

BackupTemplateRecord readTemplate(SqlStatement& s) {
    return {
        .templateId = s.colInt64(0),
        .name = s.colText(1),
        .description = s.colText(2),
        .type = static_cast<BackupType>(s.colInt64(3)),
        .includeWal = s.colInt64(4) != 0,
        .checkpointTimeout = static_cast<int32_t>(s.colInt64(5)),
        .createdAt = fromUnix(s.colInt64(6)),
        .updatedAt = fromUnix(s.colInt64(7)),
    };
}

BackupRecord readBackup(SqlStatement& s) {
    BackupRecord r;
    r.backupId = s.colInt64(0);
    r.databaseName = s.colText(1);
    r.templateId = s.colOptInt64(2);
    r.type = static_cast<BackupType>(s.colInt64(3));
    r.includeWal = s.colInt64(4) != 0;
    r.status = static_cast<BackupStatus>(s.colInt64(5));
    r.startedAt = fromUnix(s.colInt64(6));
    if (const auto value = s.colOptInt64(7)) r.finishedAt = fromUnix(*value);
    r.pgVersionNum = static_cast<uint32_t>(s.colInt64(8));
    r.parentBackupId = s.colOptInt64(9);
    r.sizeBytes = s.colNull(10) ? 0 : static_cast<uint64_t>(s.colInt64(10));
    r.originalSizeBytes = s.colNull(11) ? 0 : static_cast<uint64_t>(s.colInt64(11));
    r.storagePath = s.colOptText(12);
    r.errorMessage = s.colOptText(13);
    return r;
}

BackupVerificationRecord readVerification(SqlStatement& s) {
    BackupVerificationRecord r;
    r.backupId = s.colInt64(0);
    r.verifyHash = s.colInt64(1) != 0;
    if (const auto value = s.colOptInt64(2)) r.verifiedAt = fromUnix(*value);
    r.checksumSha256 = s.colOptText(3);
    return r;
}

ScheduleRecord readSchedule(SqlStatement& s) {
    ScheduleRecord r;
    r.scheduleId = s.colInt64(0);
    r.databaseName = s.colText(1);
    r.displayName = s.colText(2);
    r.cronExpression = s.colText(3);
    r.timezone = s.colText(4);
    r.state = static_cast<ScheduleState>(s.colInt64(5));
    r.templateId = s.colInt64(6);
    r.createdAt = fromUnix(s.colInt64(7));
    r.updatedAt = fromUnix(s.colInt64(8));
    if (const auto value = s.colOptInt64(9)) r.nextRunAt = fromUnix(*value);
    if (const auto value = s.colOptInt64(10)) r.lastRunAt = fromUnix(*value);
    r.lastBackupId = s.colOptInt64(11);
    if (const auto value = s.colOptInt64(12)) r.lastRunStatus = static_cast<BackupStatus>(*value);
    return r;
}

void insertBackupOutcome(sqlite3* database, const BackupRecord& record) {
    if (isSuccessStatus(record.status)) {
        if (!record.storagePath) {
            throw std::runtime_error{"Completed backup requires storage path"};
        }

        SqlStatement success{database,
                             "INSERT INTO backup_successes(backup_id,size_bytes,original_size_bytes,storage_path)"
                             " VALUES(?,?,?,?)"};
        success.bindInt64(1, record.backupId)
            .bindInt64(2, static_cast<int64_t>(record.sizeBytes))
            .bindInt64(3, static_cast<int64_t>(record.originalSizeBytes))
            .bindText(4, *record.storagePath);
        success.step();
        return;
    }

    if (isFailureStatus(record.status)) {
        SqlStatement failure{database,
                             "INSERT INTO backup_failures(backup_id,error_message)"
                             " VALUES(?,?)"};
        failure.bindInt64(1, record.backupId).bindOptText(2, record.errorMessage);
        failure.step();
    }
}

void insertBackupOutcome(sqlite3* database, const BackupUpdate& record) {
    if (isSuccessStatus(record.status)) {
        if (!record.storagePath) {
            throw std::runtime_error{"Completed backup requires storage path"};
        }

        SqlStatement success{database,
                             "INSERT INTO backup_successes(backup_id,size_bytes,original_size_bytes,storage_path)"
                             " VALUES(?,?,?,?)"};
        success.bindInt64(1, record.backupId)
            .bindInt64(2, static_cast<int64_t>(record.sizeBytes))
            .bindInt64(3, static_cast<int64_t>(record.originalSizeBytes))
            .bindText(4, *record.storagePath);
        success.step();
        return;
    }

    if (isFailureStatus(record.status)) {
        SqlStatement failure{database,
                             "INSERT INTO backup_failures(backup_id,error_message)"
                             " VALUES(?,?)"};
        failure.bindInt64(1, record.backupId).bindOptText(2, record.errorMessage);
        failure.step();
    }
}

void deleteBackupOutcomes(sqlite3* database, int64_t backupId) {
    SqlStatement deleteSuccess{database, "DELETE FROM backup_successes WHERE backup_id=?"};
    deleteSuccess.bindInt64(1, backupId).step();

    SqlStatement deleteFailure{database, "DELETE FROM backup_failures WHERE backup_id=?"};
    deleteFailure.bindInt64(1, backupId).step();
}

std::string makeInClause(size_t size) {
    std::string clause{"("};
    for (size_t i = 0; i < size; ++i) {
        clause += (i == 0) ? "?" : ",?";
    }
    clause += ")";
    return clause;
}

constexpr std::string_view kTemplateCols =
    "template_id,name,description,type,include_wal,checkpoint_timeout,"
    "created_at,updated_at";

constexpr std::string_view kBackupCols =
    "b.backup_id,b.database_name,b.template_id,b.type,b.include_wal,b.status,"
    "b.started_at,b.finished_at,b.pg_version_num,b.parent_backup_id,"
    "s.size_bytes,s.original_size_bytes,s.storage_path,f.error_message";

constexpr std::string_view kScheduleCols =
    "schedule_id,database_name,display_name,cron_expression,timezone,state,"
    "template_id,created_at,updated_at,next_run_at,last_run_at,last_backup_id,last_run_status";

constexpr std::string_view kSchema = R"sql(
CREATE TABLE IF NOT EXISTS backup_templates (
    template_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    description         TEXT    NOT NULL DEFAULT '',
    type                INTEGER NOT NULL DEFAULT 0,
    include_wal         INTEGER NOT NULL DEFAULT 0,
    checkpoint_timeout  INTEGER NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
    backup_id           INTEGER PRIMARY KEY,
    database_name       TEXT    NOT NULL,
    template_id         INTEGER REFERENCES backup_templates(template_id) ON DELETE SET NULL,
    type                INTEGER NOT NULL DEFAULT 0,
    include_wal         INTEGER NOT NULL DEFAULT 0,
    status              INTEGER NOT NULL DEFAULT 0,
    started_at          INTEGER NOT NULL,
    finished_at         INTEGER,
    pg_version_num      INTEGER NOT NULL DEFAULT 0,
    parent_backup_id    INTEGER REFERENCES backups(backup_id)
);

CREATE INDEX IF NOT EXISTS idx_backups_database ON backups(database_name);
CREATE INDEX IF NOT EXISTS idx_backups_status   ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_started  ON backups(started_at);

CREATE TABLE IF NOT EXISTS backup_successes (
    backup_id           INTEGER PRIMARY KEY REFERENCES backups(backup_id) ON DELETE CASCADE,
    size_bytes          INTEGER NOT NULL DEFAULT 0,
    original_size_bytes INTEGER NOT NULL DEFAULT 0,
    storage_path        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_failures (
    backup_id           INTEGER PRIMARY KEY REFERENCES backups(backup_id) ON DELETE CASCADE,
    error_message       TEXT
);

CREATE TABLE IF NOT EXISTS backup_verifications (
    backup_id        INTEGER PRIMARY KEY REFERENCES backups(backup_id) ON DELETE CASCADE,
    verify_hash      INTEGER NOT NULL DEFAULT 1,
    verified_at      INTEGER,
    checksum_sha256  TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    schedule_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    database_name       TEXT    NOT NULL,
    display_name        TEXT    NOT NULL DEFAULT '',
    cron_expression     TEXT    NOT NULL,
    timezone            TEXT    NOT NULL DEFAULT 'UTC',
    state               INTEGER NOT NULL DEFAULT 0,
    template_id         INTEGER REFERENCES backup_templates(template_id) ON DELETE RESTRICT,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    next_run_at         INTEGER,
    last_run_at         INTEGER,
    last_backup_id      INTEGER REFERENCES backups(backup_id) ON DELETE SET NULL,
    last_run_status     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schedules_database ON schedules(database_name);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at) WHERE state = 0;
)sql";

}  // namespace

SqliteBackupDataStore::SqliteBackupDataStore(const std::filesystem::path& dbPath) {
    const int rc = sqlite3_open(dbPath.string().c_str(), &m_database);
    if (rc != SQLITE_OK) {
        const std::string error = sqlite3_errmsg(m_database);
        sqlite3_close(m_database);
        throw std::runtime_error{std::format("Cannot open database '{}': {}", dbPath.string(), error)};
    }

    sqlite3_exec(m_database, "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;", nullptr, nullptr, nullptr);
    createSchema();
    initBackupIdCounter();
}

SqliteBackupDataStore::~SqliteBackupDataStore() {
    if (m_database) sqlite3_close(m_database);
}

void SqliteBackupDataStore::createSchema() {
    char* errorMessage = nullptr;
    const int rc = sqlite3_exec(m_database, kSchema.data(), nullptr, nullptr, &errorMessage);
    if (rc != SQLITE_OK) {
        const std::string error = errorMessage ? errorMessage : "unknown";
        sqlite3_free(errorMessage);
        throw std::runtime_error{std::format("Schema creation failed: {}", error)};
    }
}

void SqliteBackupDataStore::initBackupIdCounter() {
    SqlStatement statement{m_database, "SELECT COALESCE(MAX(backup_id), 0) FROM backups"};
    statement.step();
    m_nextBackupId.store(statement.colInt64(0) + 1, std::memory_order_relaxed);
}

std::expected<int64_t, std::string> SqliteBackupDataStore::allocateBackupId() {
    return m_nextBackupId.fetch_add(1, std::memory_order_relaxed);
}

std::expected<int64_t, std::string> SqliteBackupDataStore::createTemplate(const BackupTemplateRecord& record) {
    std::lock_guard lock{m_mutex};
    try {
        const auto now = toUnix(std::chrono::system_clock::now());
        SqlStatement statement{m_database,
                               "INSERT INTO backup_templates"
                               "(name,description,type,include_wal,checkpoint_timeout,created_at,updated_at)"
                               " VALUES(?,?,?,?,?,?,?)"};
        statement.bindText(1, record.name)
            .bindText(2, record.description)
            .bindInt64(3, static_cast<int64_t>(record.type))
            .bindInt64(4, record.includeWal ? 1 : 0)
            .bindInt64(5, record.checkpointTimeout)
            .bindInt64(6, now)
            .bindInt64(7, now);
        statement.step();
        return sqlite3_last_insert_rowid(m_database);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::updateTemplate(const BackupTemplateUpdate& record) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database,
                               "UPDATE backup_templates"
                               " SET name=?,description=?,type=?,include_wal=?,checkpoint_timeout=?,updated_at=?"
                               " WHERE template_id=?"};
        statement.bindText(1, record.name)
            .bindText(2, record.description)
            .bindInt64(3, static_cast<int64_t>(record.type))
            .bindInt64(4, record.includeWal ? 1 : 0)
            .bindInt64(5, record.checkpointTimeout)
            .bindInt64(6, toUnix(std::chrono::system_clock::now()))
            .bindInt64(7, record.templateId);
        statement.step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Template", record.templateId));
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<BackupTemplateRecord, std::string> SqliteBackupDataStore::getTemplate(int64_t templateId) {
    std::lock_guard lock{m_mutex};
    try {
        const auto sql = std::format("SELECT {} FROM backup_templates WHERE template_id=?", kTemplateCols);
        SqlStatement statement{m_database, sql};
        statement.bindInt64(1, templateId);
        if (!statement.step()) return std::unexpected(notFoundMessage("Template", templateId));
        return readTemplate(statement);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<std::vector<BackupTemplateRecord>, std::string> SqliteBackupDataStore::listTemplates() {
    std::lock_guard lock{m_mutex};
    try {
        const auto sql = std::format("SELECT {} FROM backup_templates ORDER BY template_id", kTemplateCols);
        SqlStatement statement{m_database, sql};
        std::vector<BackupTemplateRecord> result;
        while (statement.step()) result.push_back(readTemplate(statement));
        return result;
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::deleteTemplate(int64_t templateId) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database, "DELETE FROM backup_templates WHERE template_id=?"};
        statement.bindInt64(1, templateId).step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Template", templateId));
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::createBackup(const BackupRecord& record) {
    std::lock_guard lock{m_mutex};
    try {
        SqlTransaction transaction{m_database};

        SqlStatement statement{m_database,
                               "INSERT INTO backups"
                               "(backup_id,database_name,template_id,type,include_wal,status,"
                               "started_at,finished_at,pg_version_num,parent_backup_id)"
                               " VALUES(?,?,?,?,?,?,?,?,?,?)"};
        statement.bindInt64(1, record.backupId)
            .bindText(2, record.databaseName)
            .bindOptInt64(3, record.templateId)
            .bindInt64(4, static_cast<int64_t>(record.type))
            .bindInt64(5, record.includeWal ? 1 : 0)
            .bindInt64(6, static_cast<int64_t>(record.status))
            .bindInt64(7, toUnix(record.startedAt))
            .bindOptInt64(8, optToUnix(record.finishedAt))
            .bindInt64(9, record.pgVersionNum)
            .bindOptInt64(10, record.parentBackupId);
        statement.step();

        insertBackupOutcome(m_database, record);
        transaction.commit();
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::updateBackup(const BackupUpdate& record) {
    std::lock_guard lock{m_mutex};
    try {
        SqlTransaction transaction{m_database};

        SqlStatement statement{m_database,
                               "UPDATE backups"
                               " SET status=?,finished_at=?,pg_version_num=?"
                               " WHERE backup_id=?"};
        statement.bindInt64(1, static_cast<int64_t>(record.status))
            .bindOptInt64(2, optToUnix(record.finishedAt))
            .bindInt64(3, record.pgVersionNum)
            .bindInt64(4, record.backupId);
        statement.step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Backup", record.backupId));

        deleteBackupOutcomes(m_database, record.backupId);
        insertBackupOutcome(m_database, record);
        transaction.commit();
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<BackupRecord, std::string> SqliteBackupDataStore::getBackup(int64_t backupId) {
    std::lock_guard lock{m_mutex};
    try {
        const auto sql = std::format(
            "SELECT {}"
            " FROM backups b"
            " LEFT JOIN backup_successes s ON s.backup_id = b.backup_id"
            " LEFT JOIN backup_failures f ON f.backup_id = b.backup_id"
            " WHERE b.backup_id=?",
            kBackupCols);
        SqlStatement statement{m_database, sql};
        statement.bindInt64(1, backupId);
        if (!statement.step()) return std::unexpected(notFoundMessage("Backup", backupId));
        return readBackup(statement);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<std::vector<BackupRecord>, std::string> SqliteBackupDataStore::listBackups(
    const ListBackupsFilter& filter) {
    std::lock_guard lock{m_mutex};
    try {
        std::string where;
        const auto appendCondition = [&](std::string condition) {
            where += where.empty() ? " WHERE " : " AND ";
            where += std::move(condition);
        };

        if (filter.databaseName) appendCondition("b.database_name=?");
        if (!filter.types.empty()) appendCondition(std::format("b.type IN {}", makeInClause(filter.types.size())));
        if (!filter.statuses.empty()) {
            appendCondition(std::format("b.status IN {}", makeInClause(filter.statuses.size())));
        }
        if (filter.onlyAfter) appendCondition("b.started_at>?");

        const auto sql = std::format(
            "SELECT {}"
            " FROM backups b"
            " LEFT JOIN backup_successes s ON s.backup_id = b.backup_id"
            " LEFT JOIN backup_failures f ON f.backup_id = b.backup_id"
            "{}"
            " ORDER BY b.started_at DESC",
            kBackupCols, where);
        SqlStatement statement{m_database, sql};

        int bindIndex = 1;
        if (filter.databaseName) statement.bindText(bindIndex++, *filter.databaseName);
        for (const auto type : filter.types) statement.bindInt64(bindIndex++, static_cast<int64_t>(type));
        for (const auto status : filter.statuses) statement.bindInt64(bindIndex++, static_cast<int64_t>(status));
        if (filter.onlyAfter) statement.bindInt64(bindIndex++, toUnix(*filter.onlyAfter));

        std::vector<BackupRecord> result;
        while (statement.step()) result.push_back(readBackup(statement));
        return result;
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::deleteBackup(int64_t backupId) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database, "DELETE FROM backups WHERE backup_id=?"};
        statement.bindInt64(1, backupId).step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Backup", backupId));
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::saveVerification(const BackupVerificationRecord& record) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database,
                               "INSERT INTO backup_verifications(backup_id,verify_hash,verified_at,checksum_sha256)"
                               " VALUES(?,?,?,?)"
                               " ON CONFLICT(backup_id) DO UPDATE SET"
                               " verify_hash=excluded.verify_hash,"
                               " verified_at=excluded.verified_at,"
                               " checksum_sha256=excluded.checksum_sha256"};
        statement.bindInt64(1, record.backupId)
            .bindInt64(2, record.verifyHash ? 1 : 0)
            .bindOptInt64(3, optToUnix(record.verifiedAt))
            .bindOptText(4, record.checksumSha256);
        statement.step();
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<std::optional<BackupVerificationRecord>, std::string> SqliteBackupDataStore::getVerification(
    int64_t backupId) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database,
                               "SELECT backup_id,verify_hash,verified_at,checksum_sha256"
                               " FROM backup_verifications WHERE backup_id=?"};
        statement.bindInt64(1, backupId);
        if (!statement.step()) return std::nullopt;
        return readVerification(statement);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<int64_t, std::string> SqliteBackupDataStore::createSchedule(const ScheduleRecord& record) {
    std::lock_guard lock{m_mutex};
    try {
        const auto now = toUnix(std::chrono::system_clock::now());
        SqlStatement statement{m_database,
                               "INSERT INTO schedules"
                               "(database_name,display_name,cron_expression,timezone,state,template_id,"
                               "created_at,updated_at,next_run_at,last_run_at,last_backup_id,last_run_status)"
                               " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"};
        statement.bindText(1, record.databaseName)
            .bindText(2, record.displayName)
            .bindText(3, record.cronExpression)
            .bindText(4, record.timezone)
            .bindInt64(5, static_cast<int64_t>(record.state))
            .bindInt64(6, record.templateId)
            .bindInt64(7, now)
            .bindInt64(8, now)
            .bindOptInt64(9, optToUnix(record.nextRunAt))
            .bindOptInt64(10, optToUnix(record.lastRunAt))
            .bindOptInt64(11, record.lastBackupId)
            .bindOptInt64(
                12, record.lastRunStatus ? std::optional{static_cast<int64_t>(*record.lastRunStatus)} : std::nullopt);
        statement.step();
        return sqlite3_last_insert_rowid(m_database);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::updateSchedule(const ScheduleUpdate& record) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database,
                               "UPDATE schedules"
                               " SET display_name=?,cron_expression=?,timezone=?,state=?,template_id=?,"
                               "updated_at=?,next_run_at=?,last_run_at=?,last_backup_id=?,last_run_status=?"
                               " WHERE schedule_id=?"};
        statement.bindText(1, record.displayName)
            .bindText(2, record.cronExpression)
            .bindText(3, record.timezone)
            .bindInt64(4, static_cast<int64_t>(record.state))
            .bindInt64(5, record.templateId)
            .bindInt64(6, toUnix(std::chrono::system_clock::now()))
            .bindOptInt64(7, optToUnix(record.nextRunAt))
            .bindOptInt64(8, optToUnix(record.lastRunAt))
            .bindOptInt64(9, record.lastBackupId)
            .bindOptInt64(
                10, record.lastRunStatus ? std::optional{static_cast<int64_t>(*record.lastRunStatus)} : std::nullopt)
            .bindInt64(11, record.scheduleId);
        statement.step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Schedule", record.scheduleId));
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<ScheduleRecord, std::string> SqliteBackupDataStore::getSchedule(int64_t scheduleId) {
    std::lock_guard lock{m_mutex};
    try {
        const auto sql = std::format("SELECT {} FROM schedules WHERE schedule_id=?", kScheduleCols);
        SqlStatement statement{m_database, sql};
        statement.bindInt64(1, scheduleId);
        if (!statement.step()) return std::unexpected(notFoundMessage("Schedule", scheduleId));
        return readSchedule(statement);
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<std::vector<ScheduleRecord>, std::string> SqliteBackupDataStore::listSchedules(
    std::string_view databaseName) {
    std::lock_guard lock{m_mutex};
    try {
        const bool filtered = !databaseName.empty();
        const auto sql = std::format("SELECT {} FROM schedules{} ORDER BY schedule_id", kScheduleCols,
                                     filtered ? " WHERE database_name=?" : "");
        SqlStatement statement{m_database, sql};
        if (filtered) statement.bindText(1, databaseName);

        std::vector<ScheduleRecord> result;
        while (statement.step()) result.push_back(readSchedule(statement));
        return result;
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

std::expected<void, std::string> SqliteBackupDataStore::deleteSchedule(int64_t scheduleId) {
    std::lock_guard lock{m_mutex};
    try {
        SqlStatement statement{m_database, "DELETE FROM schedules WHERE schedule_id=?"};
        statement.bindInt64(1, scheduleId).step();
        if (sqlite3_changes(m_database) == 0) return std::unexpected(notFoundMessage("Schedule", scheduleId));
        return {};
    } catch (const std::exception& e) {
        return std::unexpected(e.what());
    }
}

}  // namespace backup
