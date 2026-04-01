#pragma once

#include <expected>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "ActiveBackup.h"
#include "BackupDataStore.h"

namespace backup {

class ScheduleManager {
public:
    using StartBackupFn = std::function<std::expected<int64_t, std::string>(const ScheduleRecord&)>;

    explicit ScheduleManager(std::shared_ptr<BackupDataStore> dataStore, StartBackupFn startBackup = {});

    ScheduleManager(const ScheduleManager&) = delete;
    ScheduleManager& operator=(const ScheduleManager&) = delete;

    void start();
    void stop();

    std::expected<int64_t, std::string> create(const ScheduleRecord& schedule);
    std::expected<void, std::string> update(const ScheduleUpdate& schedule);
    std::expected<ScheduleRecord, std::string> get(int64_t scheduleId);
    std::expected<std::vector<ScheduleRecord>, std::string> list(std::string_view databaseName);
    std::expected<void, std::string> remove(int64_t scheduleId);
    std::expected<ScheduleRecord, std::string> pause(int64_t scheduleId);
    std::expected<ScheduleRecord, std::string> resume(int64_t scheduleId);

private:
    void run(std::stop_token stopToken);
    void tick();
    std::optional<TimePoint> nextRunAt(const ScheduleRecord& schedule, TimePoint from) const;
    std::expected<void, std::string> saveRuntimeState(int64_t scheduleId, std::optional<int64_t> lastBackupId,
                                                      BackupStatus lastRunStatus, std::optional<TimePoint> nextRunAt,
                                                      std::optional<TimePoint> lastRunAt);
    void logBackgroundError(std::string_view scope, std::string_view message) const;

    std::shared_ptr<BackupDataStore> m_dataStore;
    StartBackupFn m_startBackup;
    std::jthread m_worker;
    std::mutex m_lifecycleMutex;
};

}  // namespace backup
