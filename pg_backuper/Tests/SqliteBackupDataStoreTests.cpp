#include <gtest/gtest.h>

#include <chrono>
#include <cstdint>
#include <filesystem>
#include <memory>
#include <optional>
#include <string>

#include "Backup/SqliteBackupDataStore.h"
#include "TestSupport.h"

namespace backup {
namespace {
using namespace std::chrono_literals;

TimePoint atSecond(int64_t second) { return TimePoint{std::chrono::seconds{second}}; }

class SqliteBackupDataStoreFixture : public ::testing::Test {
protected:
    SqliteBackupDataStoreFixture()
        : tempDirectory{"pg_backuper_sqlite_store"}
        , dbPath{tempDirectory.path() / "backups.sqlite"}
        , store{std::make_unique<SqliteBackupDataStore>(dbPath)} {}

    void reopenStore() {
        store.reset();
        store = std::make_unique<SqliteBackupDataStore>(dbPath);
    }

    test::TempDirectory tempDirectory;
    std::filesystem::path dbPath;
    std::unique_ptr<SqliteBackupDataStore> store;
};

TEST_F(SqliteBackupDataStoreFixture, AllocateBackupIdStartsFromOneAndContinuesFromStoredBackups) {
    const auto firstId = store->allocateBackupId();
    ASSERT_TRUE(firstId.has_value()) << firstId.error();
    EXPECT_EQ(*firstId, 1);

    const BackupRecord backup{
        .backupId = *firstId,
        .databaseName = "main",
        .templateId = std::nullopt,
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .status = BackupStatus::Completed,
        .startedAt = atSecond(100),
        .finishedAt = atSecond(101),
        .sizeBytes = 10,
        .originalSizeBytes = 12,
        .pgVersionNum = 160000,
        .storagePath = "/tmp/main/1",
        .parentBackupId = std::nullopt,
        .errorMessage = std::nullopt,
    };
    ASSERT_TRUE(store->createBackup(backup).has_value());

    reopenStore();
    const auto nextId = store->allocateBackupId();

    ASSERT_TRUE(nextId.has_value()) << nextId.error();
    EXPECT_EQ(*nextId, 2);
}

TEST_F(SqliteBackupDataStoreFixture, TemplateCrudAndNotFoundWork) {
    const BackupTemplateRecord templateRecord{
        .name = "daily",
        .description = "daily full backup",
        .type = BackupType::FullPhysical,
        .includeWal = true,
        .checkpointTimeout = 30,
    };

    const auto templateId = store->createTemplate(templateRecord);
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    const auto loadedTemplate = store->getTemplate(*templateId);
    ASSERT_TRUE(loadedTemplate.has_value()) << loadedTemplate.error();
    EXPECT_EQ(loadedTemplate->templateId, *templateId);
    EXPECT_EQ(loadedTemplate->name, "daily");
    EXPECT_EQ(loadedTemplate->description, "daily full backup");
    EXPECT_TRUE(loadedTemplate->includeWal);
    EXPECT_EQ(loadedTemplate->checkpointTimeout, 30);

    const auto templateList = store->listTemplates();
    ASSERT_TRUE(templateList.has_value()) << templateList.error();
    ASSERT_EQ(templateList->size(), 1U);
    EXPECT_EQ(templateList->front().templateId, *templateId);

    const BackupTemplateUpdate update{
        .templateId = *templateId,
        .name = "hourly",
        .description = "hourly full backup",
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .checkpointTimeout = 5,
    };
    ASSERT_TRUE(store->updateTemplate(update).has_value());

    const auto updatedTemplate = store->getTemplate(*templateId);
    ASSERT_TRUE(updatedTemplate.has_value()) << updatedTemplate.error();
    EXPECT_EQ(updatedTemplate->name, "hourly");
    EXPECT_EQ(updatedTemplate->description, "hourly full backup");
    EXPECT_FALSE(updatedTemplate->includeWal);
    EXPECT_EQ(updatedTemplate->checkpointTimeout, 5);

    ASSERT_TRUE(store->deleteTemplate(*templateId).has_value());

    const auto deletedTemplate = store->getTemplate(*templateId);
    ASSERT_FALSE(deletedTemplate.has_value());
    EXPECT_NE(deletedTemplate.error().find("not found"), std::string::npos);

    const auto updateMissing = store->updateTemplate(update);
    ASSERT_FALSE(updateMissing.has_value());
    EXPECT_NE(updateMissing.error().find("not found"), std::string::npos);

    const auto deleteMissing = store->deleteTemplate(*templateId);
    ASSERT_FALSE(deleteMissing.has_value());
    EXPECT_NE(deleteMissing.error().find("not found"), std::string::npos);
}

TEST_F(SqliteBackupDataStoreFixture, BackupCrudFiltersAndNotFoundWork) {
    const BackupRecord firstBackup{
        .backupId = 1,
        .databaseName = "main",
        .templateId = std::nullopt,
        .type = BackupType::FullPhysical,
        .includeWal = true,
        .status = BackupStatus::Completed,
        .startedAt = atSecond(100),
        .finishedAt = atSecond(120),
        .sizeBytes = 100,
        .originalSizeBytes = 200,
        .pgVersionNum = 160000,
        .storagePath = "/storage/main/1",
        .parentBackupId = std::nullopt,
        .errorMessage = std::nullopt,
    };
    const BackupRecord secondBackup{
        .backupId = 2,
        .databaseName = "analytics",
        .templateId = std::nullopt,
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .status = BackupStatus::Failed,
        .startedAt = atSecond(200),
        .finishedAt = std::nullopt,
        .sizeBytes = 0,
        .originalSizeBytes = 0,
        .pgVersionNum = 150000,
        .storagePath = "/storage/analytics/2",
        .parentBackupId = std::nullopt,
        .errorMessage = std::string{"broken"},
    };

    ASSERT_TRUE(store->createBackup(firstBackup).has_value());
    ASSERT_TRUE(store->createBackup(secondBackup).has_value());

    const auto loadedBackup = store->getBackup(1);
    ASSERT_TRUE(loadedBackup.has_value()) << loadedBackup.error();
    EXPECT_EQ(loadedBackup->databaseName, "main");
    EXPECT_EQ(loadedBackup->status, BackupStatus::Completed);
    EXPECT_EQ(loadedBackup->sizeBytes, 100U);
    ASSERT_TRUE(loadedBackup->storagePath.has_value());
    EXPECT_EQ(*loadedBackup->storagePath, "/storage/main/1");

    const BackupUpdate update{
        .backupId = 2,
        .status = BackupStatus::Cancelled,
        .finishedAt = atSecond(210),
        .sizeBytes = 7,
        .originalSizeBytes = 9,
        .pgVersionNum = 150001,
        .storagePath = std::nullopt,
        .errorMessage = std::string{"cancelled"},
    };
    ASSERT_TRUE(store->updateBackup(update).has_value());

    const auto updatedBackup = store->getBackup(2);
    ASSERT_TRUE(updatedBackup.has_value()) << updatedBackup.error();
    EXPECT_EQ(updatedBackup->status, BackupStatus::Cancelled);
    ASSERT_TRUE(updatedBackup->finishedAt.has_value());
    EXPECT_EQ(*updatedBackup->finishedAt, atSecond(210));
    EXPECT_EQ(updatedBackup->sizeBytes, 0U);
    EXPECT_FALSE(updatedBackup->storagePath.has_value());
    ASSERT_TRUE(updatedBackup->errorMessage.has_value());
    EXPECT_EQ(*updatedBackup->errorMessage, "cancelled");

    const auto filteredByDatabase = store->listBackups(ListBackupsFilter{.databaseName = std::string{"main"}});
    ASSERT_TRUE(filteredByDatabase.has_value()) << filteredByDatabase.error();
    ASSERT_EQ(filteredByDatabase->size(), 1U);
    EXPECT_EQ(filteredByDatabase->front().backupId, 1);

    const auto filteredByStatus =
        store->listBackups(ListBackupsFilter{.statuses = {BackupStatus::Cancelled}});
    ASSERT_TRUE(filteredByStatus.has_value()) << filteredByStatus.error();
    ASSERT_EQ(filteredByStatus->size(), 1U);
    EXPECT_EQ(filteredByStatus->front().backupId, 2);

    const auto filteredByTime = store->listBackups(ListBackupsFilter{.onlyAfter = atSecond(150)});
    ASSERT_TRUE(filteredByTime.has_value()) << filteredByTime.error();
    ASSERT_EQ(filteredByTime->size(), 1U);
    EXPECT_EQ(filteredByTime->front().backupId, 2);

    ASSERT_TRUE(store->deleteBackup(1).has_value());

    const auto deletedBackup = store->getBackup(1);
    ASSERT_FALSE(deletedBackup.has_value());
    EXPECT_NE(deletedBackup.error().find("not found"), std::string::npos);

    const auto updateMissing = store->updateBackup(BackupUpdate{
        .backupId = 999,
        .status = BackupStatus::Failed,
        .finishedAt = atSecond(1),
        .sizeBytes = 1,
        .originalSizeBytes = 1,
        .pgVersionNum = 1,
        .storagePath = std::nullopt,
        .errorMessage = std::string{"missing"},
    });
    ASSERT_FALSE(updateMissing.has_value());
    EXPECT_NE(updateMissing.error().find("not found"), std::string::npos);

    const auto deleteMissing = store->deleteBackup(999);
    ASSERT_FALSE(deleteMissing.has_value());
    EXPECT_NE(deleteMissing.error().find("not found"), std::string::npos);
}

TEST_F(SqliteBackupDataStoreFixture, VerificationSaveGetAndUpdateWork) {
    const BackupRecord backup{
        .backupId = 1,
        .databaseName = "main",
        .templateId = std::nullopt,
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .status = BackupStatus::Completed,
        .startedAt = atSecond(100),
        .finishedAt = atSecond(120),
        .sizeBytes = 100,
        .originalSizeBytes = 200,
        .pgVersionNum = 160000,
        .storagePath = "/storage/main/1",
        .parentBackupId = std::nullopt,
        .errorMessage = std::nullopt,
    };
    ASSERT_TRUE(store->createBackup(backup).has_value());

    const auto missingVerification = store->getVerification(1);
    ASSERT_TRUE(missingVerification.has_value()) << missingVerification.error();
    EXPECT_FALSE(missingVerification->has_value());

    ASSERT_TRUE(store
                    ->saveVerification(BackupVerificationRecord{
                        .backupId = 1,
                        .verifyHash = true,
                        .verifiedAt = std::nullopt,
                        .checksumSha256 = std::nullopt,
                    })
                    .has_value());

    const auto queuedVerification = store->getVerification(1);
    ASSERT_TRUE(queuedVerification.has_value()) << queuedVerification.error();
    ASSERT_TRUE(queuedVerification->has_value());
    EXPECT_TRUE((*queuedVerification)->verifyHash);
    EXPECT_FALSE((*queuedVerification)->verifiedAt.has_value());

    ASSERT_TRUE(store
                    ->saveVerification(BackupVerificationRecord{
                        .backupId = 1,
                        .verifyHash = false,
                        .verifiedAt = atSecond(130),
                        .checksumSha256 = std::string{"abc123"},
                    })
                    .has_value());

    const auto completedVerification = store->getVerification(1);
    ASSERT_TRUE(completedVerification.has_value()) << completedVerification.error();
    ASSERT_TRUE(completedVerification->has_value());
    EXPECT_FALSE((*completedVerification)->verifyHash);
    ASSERT_TRUE((*completedVerification)->verifiedAt.has_value());
    EXPECT_EQ(*(*completedVerification)->verifiedAt, atSecond(130));
    ASSERT_TRUE((*completedVerification)->checksumSha256.has_value());
    EXPECT_EQ(*(*completedVerification)->checksumSha256, "abc123");
}

TEST_F(SqliteBackupDataStoreFixture, ScheduleCrudListFilterAndNotFoundWork) {
    const auto templateId = store->createTemplate(BackupTemplateRecord{
        .name = "schedule-template",
        .description = "template",
        .type = BackupType::FullPhysical,
        .includeWal = false,
        .checkpointTimeout = 10,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    const auto firstScheduleId = store->createSchedule(ScheduleRecord{
        .databaseName = "main",
        .displayName = "main daily",
        .cronExpression = "0 2 * * *",
        .timezone = "UTC",
        .state = ScheduleState::Active,
        .templateId = *templateId,
        .nextRunAt = atSecond(500),
    });
    ASSERT_TRUE(firstScheduleId.has_value()) << firstScheduleId.error();

    const auto secondScheduleId = store->createSchedule(ScheduleRecord{
        .databaseName = "analytics",
        .displayName = "analytics hourly",
        .cronExpression = "0 * * * *",
        .timezone = "Europe/Moscow",
        .state = ScheduleState::Paused,
        .templateId = *templateId,
        .nextRunAt = atSecond(700),
    });
    ASSERT_TRUE(secondScheduleId.has_value()) << secondScheduleId.error();

    ASSERT_TRUE(store
                    ->createBackup(BackupRecord{
                        .backupId = 77,
                        .databaseName = "analytics",
                        .templateId = *templateId,
                        .type = BackupType::FullPhysical,
                        .includeWal = false,
                        .status = BackupStatus::Completed,
                        .startedAt = atSecond(800),
                        .finishedAt = atSecond(840),
                        .sizeBytes = 10,
                        .originalSizeBytes = 12,
                        .pgVersionNum = 160000,
                        .storagePath = "/storage/analytics/77",
                        .parentBackupId = std::nullopt,
                        .errorMessage = std::nullopt,
                    })
                    .has_value());

    const auto allSchedules = store->listSchedules("");
    ASSERT_TRUE(allSchedules.has_value()) << allSchedules.error();
    ASSERT_EQ(allSchedules->size(), 2U);

    const auto mainSchedules = store->listSchedules("main");
    ASSERT_TRUE(mainSchedules.has_value()) << mainSchedules.error();
    ASSERT_EQ(mainSchedules->size(), 1U);
    EXPECT_EQ(mainSchedules->front().scheduleId, *firstScheduleId);

    ASSERT_TRUE(store
                    ->updateSchedule(ScheduleUpdate{
                        .scheduleId = *secondScheduleId,
                        .displayName = "analytics paused",
                        .cronExpression = "15 * * * *",
                        .timezone = "UTC",
                        .state = ScheduleState::Active,
                        .templateId = *templateId,
                        .nextRunAt = atSecond(900),
                        .lastRunAt = atSecond(850),
                        .lastBackupId = 77,
                        .lastRunStatus = BackupStatus::Completed,
                    })
                    .has_value());

    const auto updatedSchedule = store->getSchedule(*secondScheduleId);
    ASSERT_TRUE(updatedSchedule.has_value()) << updatedSchedule.error();
    EXPECT_EQ(updatedSchedule->displayName, "analytics paused");
    EXPECT_EQ(updatedSchedule->cronExpression, "15 * * * *");
    EXPECT_EQ(updatedSchedule->timezone, "UTC");
    EXPECT_EQ(updatedSchedule->state, ScheduleState::Active);
    ASSERT_TRUE(updatedSchedule->nextRunAt.has_value());
    EXPECT_EQ(*updatedSchedule->nextRunAt, atSecond(900));
    ASSERT_TRUE(updatedSchedule->lastRunAt.has_value());
    EXPECT_EQ(*updatedSchedule->lastRunAt, atSecond(850));
    ASSERT_TRUE(updatedSchedule->lastBackupId.has_value());
    EXPECT_EQ(*updatedSchedule->lastBackupId, 77);
    ASSERT_TRUE(updatedSchedule->lastRunStatus.has_value());
    EXPECT_EQ(*updatedSchedule->lastRunStatus, BackupStatus::Completed);

    ASSERT_TRUE(store->deleteSchedule(*firstScheduleId).has_value());

    const auto deletedSchedule = store->getSchedule(*firstScheduleId);
    ASSERT_FALSE(deletedSchedule.has_value());
    EXPECT_NE(deletedSchedule.error().find("not found"), std::string::npos);

    const auto updateMissing = store->updateSchedule(ScheduleUpdate{
        .scheduleId = 999,
        .displayName = "missing",
        .cronExpression = "* * * * *",
        .timezone = "UTC",
        .state = ScheduleState::Active,
        .templateId = *templateId,
    });
    ASSERT_FALSE(updateMissing.has_value());
    EXPECT_NE(updateMissing.error().find("not found"), std::string::npos);

    const auto deleteMissing = store->deleteSchedule(999);
    ASSERT_FALSE(deleteMissing.has_value());
    EXPECT_NE(deleteMissing.error().find("not found"), std::string::npos);
}
}  // namespace
}  // namespace backup
