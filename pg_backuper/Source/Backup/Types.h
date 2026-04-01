#pragma once

#include <chrono>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace backup {
using TimePoint = std::chrono::system_clock::time_point;

enum class BackupType : int {
    FullPhysical = 0,
};

enum class BackupStatus : int {
    Queued = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    Deleting = 5,
    Verifying = 6,
};

enum class ScheduleState : int {
    Active = 0,
    Paused = 1,
};

struct BackupTemplateRecord {
    int64_t templateId{0};
    std::string name;
    std::string description;
    BackupType type{BackupType::FullPhysical};
    bool includeWal{false};
    int32_t checkpointTimeout{0};
    TimePoint createdAt;
    TimePoint updatedAt;
};

struct BackupTemplateUpdate {
    int64_t templateId{0};
    std::string name;
    std::string description;
    BackupType type{BackupType::FullPhysical};
    bool includeWal{false};
    int32_t checkpointTimeout{0};
};

struct BackupRecord {
    int64_t backupId{0};  // 0 = не назначен; выдаётся через allocateBackupId()
    std::string databaseName;
    std::optional<int64_t> templateId;
    BackupType type{BackupType::FullPhysical};
    bool includeWal{false};
    BackupStatus status{BackupStatus::Queued};
    TimePoint startedAt;
    std::optional<TimePoint> finishedAt;
    uint64_t sizeBytes{0};
    uint64_t originalSizeBytes{0};
    uint32_t pgVersionNum{0};
    std::optional<std::string> storagePath;
    std::optional<int64_t> parentBackupId;
    std::optional<std::string> errorMessage;
};

struct BackupUpdate {
    int64_t backupId{0};
    BackupStatus status{BackupStatus::Queued};
    std::optional<TimePoint> finishedAt;
    uint64_t sizeBytes{0};
    uint64_t originalSizeBytes{0};
    uint32_t pgVersionNum{0};
    std::optional<std::string> storagePath;
    std::optional<std::string> errorMessage;
};

struct BackupVerificationRecord {
    int64_t backupId{0};
    bool verifyHash{true};
    std::optional<TimePoint> verifiedAt;  // nullopt = ещё не проверен
    std::optional<std::string> checksumSha256;
};

struct ScheduleRecord {
    int64_t scheduleId{0};
    std::string databaseName;
    std::string displayName;
    std::string cronExpression;
    std::string timezone{"UTC"};
    ScheduleState state{ScheduleState::Active};
    int64_t templateId{0};
    TimePoint createdAt;
    TimePoint updatedAt;
    std::optional<TimePoint> nextRunAt;
    std::optional<TimePoint> lastRunAt;
    std::optional<int64_t> lastBackupId;
    std::optional<BackupStatus> lastRunStatus;
};

struct ScheduleUpdate {
    int64_t scheduleId{0};
    std::string displayName;
    std::string cronExpression;
    std::string timezone{"UTC"};
    ScheduleState state{ScheduleState::Active};
    int64_t templateId{0};
    std::optional<TimePoint> nextRunAt;
    std::optional<TimePoint> lastRunAt;
    std::optional<int64_t> lastBackupId;
    std::optional<BackupStatus> lastRunStatus;
};

struct ListBackupsFilter {
    std::optional<std::string> databaseName;
    std::vector<BackupType> types;
    std::vector<BackupStatus> statuses;
    std::optional<TimePoint> onlyAfter;
};
}  // namespace backup
