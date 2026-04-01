#include <gtest/gtest.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <memory>
#include <thread>

#include <google/protobuf/empty.pb.h>
#include <grpcpp/server_context.h>

#include "Backup/ActiveBackupManager.h"
#include "Backup/BackupCoordinator.h"
#include "Backup/LocalFileStorage.h"
#include "Backup/SqliteBackupDataStore.h"
#include "BackupGrpcService.h"
#include "TestSupport.h"

namespace {

using namespace std::chrono_literals;

class BackupGrpcServiceFixture : public ::testing::Test {
protected:
    BackupGrpcServiceFixture()
        : tempDirectory{"pg_backuper_grpc_service"},
          fileStorage{std::make_shared<backup::LocalFileStorage>(tempDirectory.path() / "storage")},
          dataStore{std::make_shared<backup::SqliteBackupDataStore>(tempDirectory.path() / "backups.sqlite")},
          activeManager{std::make_shared<backup::ActiveBackupManager>()},
          databases{{"main",
                     config::DatabaseSettings{
                         .schema = "main",
                         .user = "postgres",
                         .password = "secret",
                         .host = "127.0.0.1",
                         .port = 5432,
                     }}} {
        backupCoordinator = std::make_shared<backup::BackupCoordinator>(
            dataStore, activeManager, fileStorage, databases, backup::FullPhysicalBackupOptions{});
        scheduleManager = std::make_shared<backup::ScheduleManager>(
            dataStore, [this](const backup::ScheduleRecord& schedule) {
                return backupCoordinator->startBackup(schedule.databaseName, schedule.templateId, schedule.scheduleId);
            });
    }

    std::filesystem::path writeExecutableScript(std::string_view fileName, std::string_view scriptBody) const {
        const auto scriptPath = tempDirectory.path() / fileName;
        std::ofstream stream{scriptPath, std::ios::binary};
        stream << scriptBody;
        stream.close();

        std::filesystem::permissions(
            scriptPath,
            std::filesystem::perms::owner_read | std::filesystem::perms::owner_write |
                std::filesystem::perms::owner_exec | std::filesystem::perms::group_read |
                std::filesystem::perms::group_exec | std::filesystem::perms::others_read |
                std::filesystem::perms::others_exec,
            std::filesystem::perm_options::replace);
        return scriptPath;
    }

    BackupGrpcService makeService(backup::FullPhysicalBackupOptions options = {}) {
        backupCoordinator = std::make_shared<backup::BackupCoordinator>(dataStore, activeManager, fileStorage, databases,
                                                                        std::move(options));
        scheduleManager = std::make_shared<backup::ScheduleManager>(
            dataStore, [this](const backup::ScheduleRecord& schedule) {
                return backupCoordinator->startBackup(schedule.databaseName, schedule.templateId, schedule.scheduleId);
            });
        return BackupGrpcService{dataStore, backupCoordinator, activeManager, scheduleManager, fileStorage, databases};
    }

    static backup::TimePoint atSecond(int64_t second) { return backup::TimePoint{std::chrono::seconds{second}}; }

    backup::test::TempDirectory tempDirectory;
    std::shared_ptr<backup::LocalFileStorage> fileStorage;
    std::shared_ptr<backup::SqliteBackupDataStore> dataStore;
    std::shared_ptr<backup::ActiveBackupManager> activeManager;
    std::shared_ptr<backup::BackupCoordinator> backupCoordinator;
    std::shared_ptr<backup::ScheduleManager> scheduleManager;
    std::map<std::string, config::DatabaseSettings> databases;
};

TEST_F(BackupGrpcServiceFixture, PingDatabaseReturnsConfiguredDatabases) {
    auto service = makeService();
    grpc::ServerContext context;
    pgbackup::v1::PingDatabaseResponse response;

    const auto status = service.PingDatabase(&context, &google::protobuf::Empty::default_instance(), &response);

    ASSERT_TRUE(status.ok()) << status.error_message();
    ASSERT_EQ(response.databases_size(), 1);
    EXPECT_EQ(response.databases(0).name(), "main");
    EXPECT_EQ(response.databases(0).config().host(), "127.0.0.1");
}

TEST_F(BackupGrpcServiceFixture, TemplateCrudMethodsWork) {
    auto service = makeService();
    grpc::ServerContext context;

    pgbackup::v1::CreateBackupTemplateRequest createRequest;
    createRequest.set_name("daily");
    createRequest.set_description("daily backup");
    createRequest.set_type(pgbackup::v1::BACKUP_TYPE_FULL_PHYSICAL);
    createRequest.set_include_wal(true);
    createRequest.set_checkpoint_timeout(15);

    pgbackup::v1::BackupTemplate created;
    const auto createStatus = service.CreateBackupTemplate(&context, &createRequest, &created);
    ASSERT_TRUE(createStatus.ok()) << createStatus.error_message();
    EXPECT_EQ(created.name(), "daily");
    EXPECT_TRUE(created.include_wal());

    pgbackup::v1::ListBackupTemplatesRequest listRequest;
    pgbackup::v1::ListBackupTemplatesResponse listResponse;
    ASSERT_TRUE(service.ListBackupTemplates(&context, &listRequest, &listResponse).ok());
    ASSERT_EQ(listResponse.templates_size(), 1);
    EXPECT_EQ(listResponse.templates(0).template_id(), created.template_id());

    pgbackup::v1::UpdateBackupTemplateRequest updateRequest;
    updateRequest.set_template_id(created.template_id());
    updateRequest.set_name("hourly");
    updateRequest.set_description("hourly backup");
    updateRequest.set_type(pgbackup::v1::BACKUP_TYPE_FULL_PHYSICAL);
    updateRequest.set_include_wal(false);
    updateRequest.set_checkpoint_timeout(5);

    pgbackup::v1::BackupTemplate updated;
    ASSERT_TRUE(service.UpdateBackupTemplate(&context, &updateRequest, &updated).ok());
    EXPECT_EQ(updated.name(), "hourly");
    EXPECT_FALSE(updated.include_wal());

    pgbackup::v1::GetBackupTemplateRequest getRequest;
    getRequest.set_template_id(created.template_id());
    pgbackup::v1::BackupTemplate loaded;
    ASSERT_TRUE(service.GetBackupTemplate(&context, &getRequest, &loaded).ok());
    EXPECT_EQ(loaded.name(), "hourly");

    pgbackup::v1::DeleteBackupTemplateRequest deleteRequest;
    deleteRequest.set_template_id(created.template_id());
    google::protobuf::Empty empty;
    ASSERT_TRUE(service.DeleteBackupTemplate(&context, &deleteRequest, &empty).ok());
}

TEST_F(BackupGrpcServiceFixture, CompletedBackupMethodsWork) {
    auto service = makeService();
    grpc::ServerContext context;

    const auto workingPath = fileStorage->workingPath(77);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    std::ofstream(*workingPath / "base.tar") << "ok";
    const auto finalPath = fileStorage->commit(77, "main");
    ASSERT_TRUE(finalPath.has_value()) << finalPath.error();

    ASSERT_TRUE(dataStore
                    ->createBackup(backup::BackupRecord{
                        .backupId = 77,
                        .databaseName = "main",
                        .templateId = std::nullopt,
                        .type = backup::BackupType::FullPhysical,
                        .includeWal = false,
                        .status = backup::BackupStatus::Completed,
                        .startedAt = atSecond(10),
                        .finishedAt = atSecond(20),
                        .sizeBytes = 2,
                        .originalSizeBytes = 4,
                        .pgVersionNum = 160000,
                        .storagePath = finalPath->string(),
                        .parentBackupId = std::nullopt,
                        .errorMessage = std::nullopt,
                    })
                    .has_value());

    ASSERT_TRUE(dataStore
                    ->saveVerification(backup::BackupVerificationRecord{
                        .backupId = 77,
                        .verifyHash = true,
                        .verifiedAt = atSecond(30),
                        .checksumSha256 = std::string{"abc"},
                    })
                    .has_value());

    pgbackup::v1::GetBackupRequest getRequest;
    getRequest.set_backup_id(77);
    pgbackup::v1::Backup backupInfo;
    const auto getStatus = service.GetBackup(&context, &getRequest, &backupInfo);
    ASSERT_TRUE(getStatus.ok()) << getStatus.error_message();
    EXPECT_EQ(backupInfo.backup_id(), 77);
    EXPECT_EQ(backupInfo.database_name(), "main");
    ASSERT_TRUE(backupInfo.has_info());
    ASSERT_TRUE(backupInfo.info().has_store_info());
    EXPECT_EQ(backupInfo.info().store_info().size_bytes(), 2U);
    ASSERT_TRUE(backupInfo.info().store_info().has_verification());
    EXPECT_EQ(backupInfo.info().store_info().verification().checksum_sha256(), "abc");

    pgbackup::v1::ListBackupsRequest listRequest;
    listRequest.set_database_name("main");
    pgbackup::v1::ListBackupsResponse listResponse;
    ASSERT_TRUE(service.GetBackups(&context, &listRequest, &listResponse).ok());
    ASSERT_EQ(listResponse.backups_size(), 1);
    EXPECT_EQ(listResponse.backups(0).backup_id(), 77);

    pgbackup::v1::DeleteBackupRequest deleteRequest;
    deleteRequest.set_backup_id(77);
    google::protobuf::Empty empty;
    ASSERT_TRUE(service.DeleteBackup(&context, &deleteRequest, &empty).ok());
    EXPECT_FALSE(std::filesystem::exists(*finalPath));
    EXPECT_FALSE(dataStore->getBackup(77).has_value());
}

TEST_F(BackupGrpcServiceFixture, VerifyBackupStoresChecksum) {
    auto service = makeService();
    grpc::ServerContext context;

    const auto workingPath = fileStorage->workingPath(88);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    std::ofstream(*workingPath / "base.tar") << "payload";
    const auto finalPath = fileStorage->commit(88, "main");
    ASSERT_TRUE(finalPath.has_value()) << finalPath.error();

    ASSERT_TRUE(dataStore
                    ->createBackup(backup::BackupRecord{
                        .backupId = 88,
                        .databaseName = "main",
                        .templateId = std::nullopt,
                        .type = backup::BackupType::FullPhysical,
                        .includeWal = false,
                        .status = backup::BackupStatus::Completed,
                        .startedAt = atSecond(10),
                        .finishedAt = atSecond(20),
                        .sizeBytes = 7,
                        .originalSizeBytes = 7,
                        .pgVersionNum = 160000,
                        .storagePath = finalPath->string(),
                        .parentBackupId = std::nullopt,
                        .errorMessage = std::nullopt,
                    })
                    .has_value());

    pgbackup::v1::VerifyBackupRequest request;
    request.set_backup_id(88);
    request.set_verify_hash(true);
    pgbackup::v1::BackupVerification response;

    const auto status = service.VerifyBackup(&context, &request, &response);

    ASSERT_TRUE(status.ok()) << status.error_message();
    EXPECT_EQ(response.backup_id(), 88);
    EXPECT_TRUE(response.verify_hash());
    ASSERT_TRUE(response.has_verified_at());
    EXPECT_FALSE(response.checksum_sha256().empty());
}

TEST_F(BackupGrpcServiceFixture, ScheduleMethodsWork) {
    auto service = makeService();
    grpc::ServerContext context;

    const auto templateId = dataStore->createTemplate(backup::BackupTemplateRecord{
        .name = "daily",
        .description = "daily",
        .type = backup::BackupType::FullPhysical,
        .includeWal = false,
        .checkpointTimeout = 0,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    pgbackup::v1::CreateScheduleRequest createRequest;
    createRequest.set_database_name("main");
    createRequest.set_display_name("main daily");
    createRequest.set_cron_expression("0 2 * * *");
    createRequest.set_timezone("UTC");
    createRequest.set_template_id(*templateId);
    pgbackup::v1::Schedule created;
    ASSERT_TRUE(service.CreateSchedule(&context, &createRequest, &created).ok());
    EXPECT_EQ(created.database_name(), "main");
    EXPECT_EQ(created.state(), pgbackup::v1::SCHEDULE_STATE_ACTIVE);

    pgbackup::v1::ListSchedulesRequest listRequest;
    listRequest.set_database_name("main");
    pgbackup::v1::ListSchedulesResponse listResponse;
    ASSERT_TRUE(service.ListSchedules(&context, &listRequest, &listResponse).ok());
    ASSERT_EQ(listResponse.schedules_size(), 1);
    EXPECT_EQ(listResponse.schedules(0).schedule_id(), created.schedule_id());

    pgbackup::v1::UpdateScheduleRequest updateRequest;
    updateRequest.set_schedule_id(created.schedule_id());
    updateRequest.set_display_name("main hourly");
    updateRequest.set_cron_expression("0 * * * *");
    updateRequest.set_timezone("Europe/Moscow");
    updateRequest.set_template_id(*templateId);
    pgbackup::v1::Schedule updated;
    ASSERT_TRUE(service.UpdateSchedule(&context, &updateRequest, &updated).ok());
    EXPECT_EQ(updated.display_name(), "main hourly");

    pgbackup::v1::PauseScheduleRequest pauseRequest;
    pauseRequest.set_schedule_id(created.schedule_id());
    pgbackup::v1::Schedule paused;
    ASSERT_TRUE(service.PauseSchedule(&context, &pauseRequest, &paused).ok());
    EXPECT_EQ(paused.state(), pgbackup::v1::SCHEDULE_STATE_PAUSED);

    pgbackup::v1::ResumeScheduleRequest resumeRequest;
    resumeRequest.set_schedule_id(created.schedule_id());
    pgbackup::v1::Schedule resumed;
    ASSERT_TRUE(service.ResumeSchedule(&context, &resumeRequest, &resumed).ok());
    EXPECT_EQ(resumed.state(), pgbackup::v1::SCHEDULE_STATE_ACTIVE);

    pgbackup::v1::GetScheduleRequest getRequest;
    getRequest.set_schedule_id(created.schedule_id());
    pgbackup::v1::Schedule loaded;
    ASSERT_TRUE(service.GetSchedule(&context, &getRequest, &loaded).ok());
    EXPECT_EQ(loaded.display_name(), "main hourly");

    pgbackup::v1::DeleteScheduleRequest deleteRequest;
    deleteRequest.set_schedule_id(created.schedule_id());
    google::protobuf::Empty empty;
    ASSERT_TRUE(service.DeleteSchedule(&context, &deleteRequest, &empty).ok());
}

TEST_F(BackupGrpcServiceFixture, StartCancelAndListActiveBackupWork) {
    const auto scriptPath = writeExecutableScript(
        "fake_pg_basebackup_service.sh",
        R"(#!/usr/bin/env bash
set -euo pipefail
trap 'exit 143' TERM INT
pgdata=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pgdata) pgdata="$2"; shift 2 ;;
    --host|--port|--username|--wal-method) shift 2 ;;
    --progress|--verbose|--no-password) shift ;;
    *) shift ;;
  esac
done
mkdir -p "$pgdata"
printf '1/10 kB (10%%), 0/1 tablespace\n' >&2
while true; do
  printf 'x' >> "$pgdata/chunk.bin"
  sleep 0.2
done
)");

    auto service = makeService(backup::FullPhysicalBackupOptions{.executablePath = scriptPath});
    grpc::ServerContext context;

    const auto templateId = dataStore->createTemplate(backup::BackupTemplateRecord{
        .name = "daily",
        .description = "daily",
        .type = backup::BackupType::FullPhysical,
        .includeWal = true,
        .checkpointTimeout = 0,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    pgbackup::v1::StartBackupRequest startRequest;
    startRequest.set_database_name("main");
    startRequest.set_template_id(*templateId);
    pgbackup::v1::StartBackupResponse startResponse;
    const auto startStatus = service.StartBackup(&context, &startRequest, &startResponse);
    ASSERT_TRUE(startStatus.ok()) << startStatus.error_message();
    EXPECT_GT(startResponse.backup_id(), 0);

    pgbackup::v1::ListBackupsRequest activeRequest;
    activeRequest.add_status(pgbackup::v1::BACKUP_STATUS_RUNNING);
    pgbackup::v1::ListBackupsResponse activeResponse;
    ASSERT_TRUE(service.GetBackups(&context, &activeRequest, &activeResponse).ok());
    ASSERT_EQ(activeResponse.backups_size(), 1);
    EXPECT_EQ(activeResponse.backups(0).database_name(), "main");
    ASSERT_TRUE(activeResponse.backups(0).has_backup_template());
    EXPECT_EQ(activeResponse.backups(0).backup_template().template_id(), *templateId);
    ASSERT_TRUE(activeResponse.backups(0).has_info());
    EXPECT_TRUE(activeResponse.backups(0).info().has_active_info());

    pgbackup::v1::CancelBackupRequest cancelRequest;
    cancelRequest.set_backup_id(startResponse.backup_id());
    pgbackup::v1::CancelBackupResponse cancelResponse;
    ASSERT_TRUE(service.CancelBackup(&context, &cancelRequest, &cancelResponse).ok());
    EXPECT_EQ(cancelResponse.result(), pgbackup::v1::CANCEL_RESULT_SUCCESS);

    for (int attempt = 0; attempt < 20; ++attempt) {
        pgbackup::v1::ListBackupsRequest cancelledRequest;
        cancelledRequest.add_status(pgbackup::v1::BACKUP_STATUS_CANCELLED);
        pgbackup::v1::ListBackupsResponse afterCancel;
        ASSERT_TRUE(service.GetBackups(&context, &cancelledRequest, &afterCancel).ok());
        if (afterCancel.backups_size() == 1) {
            EXPECT_EQ(afterCancel.backups(0).backup_id(), startResponse.backup_id());
            EXPECT_TRUE(afterCancel.backups(0).info().has_error_info());
            return;
        }
        std::this_thread::sleep_for(100ms);
    }

    FAIL() << "Cancelled backup was not persisted";
}

TEST_F(BackupGrpcServiceFixture, StartBackupPersistsCompletedBackup) {
    const auto scriptPath = writeExecutableScript(
        "fake_pg_basebackup_completed_service.sh",
        R"(#!/usr/bin/env bash
set -euo pipefail
pgdata=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pgdata) pgdata="$2"; shift 2 ;;
    --host|--port|--username|--wal-method) shift 2 ;;
    --progress|--verbose|--no-password) shift ;;
    *) shift ;;
  esac
done
mkdir -p "$pgdata"
printf '1/1 kB (100%%), 1/1 tablespace\n' >&2
printf 'ok' > "$pgdata/base.tar"
)");

    auto service = makeService(backup::FullPhysicalBackupOptions{.executablePath = scriptPath});
    grpc::ServerContext context;

    const auto templateId = dataStore->createTemplate(backup::BackupTemplateRecord{
        .name = "daily",
        .description = "daily",
        .type = backup::BackupType::FullPhysical,
        .includeWal = true,
        .checkpointTimeout = 0,
    });
    ASSERT_TRUE(templateId.has_value()) << templateId.error();

    pgbackup::v1::StartBackupRequest startRequest;
    startRequest.set_database_name("main");
    startRequest.set_template_id(*templateId);
    pgbackup::v1::StartBackupResponse startResponse;
    ASSERT_TRUE(service.StartBackup(&context, &startRequest, &startResponse).ok());

    for (int attempt = 0; attempt < 30; ++attempt) {
        const auto backup = dataStore->getBackup(startResponse.backup_id());
        if (backup && backup->status == backup::BackupStatus::Completed) {
            EXPECT_EQ(backup->databaseName, "main");
            EXPECT_EQ(backup->templateId, *templateId);
            ASSERT_TRUE(backup->storagePath.has_value());
            EXPECT_TRUE(std::filesystem::exists(*backup->storagePath));
            return;
        }
        std::this_thread::sleep_for(50ms);
    }

    FAIL() << "Completed backup was not persisted";
}

}  // namespace
