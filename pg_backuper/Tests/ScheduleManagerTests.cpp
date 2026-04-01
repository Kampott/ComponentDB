#include <gtest/gtest.h>

#include <atomic>
#include <chrono>
#include <memory>
#include <thread>

#include "Backup/ScheduleManager.h"
#include "Backup/SqliteBackupDataStore.h"
#include "TestSupport.h"

namespace backup {
namespace {

using namespace std::chrono_literals;

class ScheduleManagerFixture : public ::testing::Test {
protected:
    ScheduleManagerFixture()
        : tempDirectory{"pg_backuper_schedule_manager"}
        , dataStore{std::make_shared<SqliteBackupDataStore>(tempDirectory.path() / "backups.sqlite")} {}

    test::TempDirectory tempDirectory;
    std::shared_ptr<SqliteBackupDataStore> dataStore;
};

TEST_F(ScheduleManagerFixture, CreateComputesNextRunAtForActiveSchedule) {
    ScheduleManager manager{dataStore};
    const auto templateId = dataStore->createTemplate(BackupTemplateRecord{
        .name = "daily",
        .description = "daily",
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .checkpointTimeout = 0,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    const auto scheduleId = manager.create(ScheduleRecord{
        .databaseName = "main",
        .displayName = "each minute",
        .cronExpression = "* * * * *",
        .timezone = "UTC",
        .templateId = *templateId,
    });
    ASSERT_TRUE(scheduleId.has_value()) << scheduleId.error();

    const auto schedule = dataStore->getSchedule(*scheduleId);
    ASSERT_TRUE(schedule.has_value()) << schedule.error();
    ASSERT_TRUE(schedule->nextRunAt.has_value());
    EXPECT_GT(*schedule->nextRunAt, std::chrono::system_clock::now());
}

TEST_F(ScheduleManagerFixture, TickStartsDueScheduleAndStoresRuntimeState) {
    std::atomic_int startedCalls{0};
    std::shared_ptr<ScheduleManager> manager = std::make_shared<ScheduleManager>(
        dataStore,
        [&startedCalls](const ScheduleRecord&) -> std::expected<int64_t, std::string> {
            startedCalls.fetch_add(1);
            return 777;
        });

    const auto templateId = dataStore->createTemplate(BackupTemplateRecord{
        .name = "daily",
        .description = "daily",
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .checkpointTimeout = 0,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    const auto scheduleId = dataStore->createSchedule(ScheduleRecord{
        .databaseName = "main",
        .displayName = "due now",
        .cronExpression = "* * * * *",
        .timezone = "UTC",
        .state = ScheduleState::Active,
        .templateId = *templateId,
        .nextRunAt = std::chrono::system_clock::now() - 1s,
    });
    ASSERT_TRUE(scheduleId.has_value()) << scheduleId.error();

    manager->start();
    for (int attempt = 0; attempt < 30; ++attempt) {
        const auto schedule = dataStore->getSchedule(*scheduleId);
        ASSERT_TRUE(schedule.has_value()) << schedule.error();
        if (!schedule->lastBackupId && schedule->lastRunStatus &&
            *schedule->lastRunStatus == BackupStatus::Running && schedule->nextRunAt &&
            *schedule->nextRunAt > std::chrono::system_clock::now()) {
            manager->stop();
            EXPECT_EQ(startedCalls.load(), 1);
            return;
        }
        std::this_thread::sleep_for(50ms);
    }

    manager->stop();
    FAIL() << "Schedule was not started by scheduler loop";
}

}  // namespace
}  // namespace backup
