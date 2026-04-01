#include <gtest/gtest.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <future>
#include <memory>
#include <string>

#include "Backup/FullPhysicalBackup.h"
#include "Backup/LocalFileStorage.h"
#include "TestSupport.h"

namespace backup {
namespace {

using namespace std::chrono_literals;

class FullPhysicalBackupFixture : public ::testing::Test {
protected:
    FullPhysicalBackupFixture()
        : tempDirectory{"pg_backuper_full_physical_backup"}
        , fileStorage{std::make_shared<LocalFileStorage>(tempDirectory.path())} {}

    std::filesystem::path writeExecutableScript(std::string_view fileName, std::string_view scriptBody) const {
        const auto scriptPath = tempDirectory.path() / fileName;
        std::ofstream stream{scriptPath, std::ios::binary};
        stream << scriptBody;
        stream.close();

        std::filesystem::permissions(scriptPath,
                                     std::filesystem::perms::owner_read | std::filesystem::perms::owner_write |
                                         std::filesystem::perms::owner_exec | std::filesystem::perms::group_read |
                                         std::filesystem::perms::group_exec | std::filesystem::perms::others_read |
                                         std::filesystem::perms::others_exec,
                                     std::filesystem::perm_options::replace);
        return scriptPath;
    }

    config::DatabaseSettings makeDatabaseSettings() const {
        return config::DatabaseSettings{
            .schema = "main",
            .user = "postgres",
            .password = "secret",
            .host = "127.0.0.1",
            .port = 5432,
        };
    }

    test::TempDirectory tempDirectory;
    std::shared_ptr<LocalFileStorage> fileStorage;
};

TEST_F(FullPhysicalBackupFixture, StartCompletesAndCommitsBackup) {
    const auto scriptPath = writeExecutableScript("fake_pg_basebackup_success.sh",
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
printf '1/2 kB (50%%), 0/1 tablespace\n' >&2
printf 'ok' > "$pgdata/base.tar"
sleep 0.05
printf '2/2 kB (100%%), 1/1 tablespace\n' >&2
)");

    std::promise<CompletedBackupData> completionPromise;
    std::future<CompletedBackupData> completionFuture = completionPromise.get_future();
    std::promise<BackupProgress> progressPromise;
    std::future<BackupProgress> progressFuture = progressPromise.get_future();

    ActiveBackupEvents events;
    events.onProgress = [&progressPromise](BackupProgress progress) {
        if (progress.bytesProcessed > 0) {
            try {
                progressPromise.set_value(progress);
            } catch (...) {
            }
        }
    };
    events.onCompleted = [&completionPromise](CompletedBackupData data) {
        completionPromise.set_value(std::move(data));
    };

    FullPhysicalBackup backup{
        42,
        "main",
        makeDatabaseSettings(),
        fileStorage,
        std::move(events),
        FullPhysicalBackupOptions{.executablePath = scriptPath, .includeWal = true},
    };

    const auto startResult = backup.start();
    ASSERT_TRUE(startResult.has_value()) << startResult.error();

    ASSERT_EQ(progressFuture.wait_for(2s), std::future_status::ready);
    const auto progress = progressFuture.get();
    EXPECT_GT(progress.bytesProcessed, 0U);

    ASSERT_EQ(completionFuture.wait_for(2s), std::future_status::ready);
    const auto completed = completionFuture.get();

    EXPECT_EQ(backup.status(), BackupStatus::Completed);
    EXPECT_EQ(completed.finalPath, tempDirectory.path() / "main" / "42");
    EXPECT_TRUE(std::filesystem::exists(completed.finalPath / "base.tar"));
    EXPECT_FALSE(std::filesystem::exists(tempDirectory.path() / "working" / "42"));
    EXPECT_EQ(completed.sizeBytes, 2U);
    EXPECT_EQ(completed.originalSizeBytes, 2048U);
}

TEST_F(FullPhysicalBackupFixture, CancelStopsBackupAndRemovesWorkingDirectory) {
    const auto scriptPath = writeExecutableScript("fake_pg_basebackup_cancel.sh",
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

    std::promise<void> cancelledPromise;
    auto cancelledFuture = cancelledPromise.get_future();

    ActiveBackupEvents events;
    events.onCancelled = [&cancelledPromise]() { cancelledPromise.set_value(); };

    FullPhysicalBackup backup{
        43,
        "main",
        makeDatabaseSettings(),
        fileStorage,
        std::move(events),
        FullPhysicalBackupOptions{.executablePath = scriptPath},
    };

    const auto startResult = backup.start();
    ASSERT_TRUE(startResult.has_value()) << startResult.error();

    std::this_thread::sleep_for(150ms);
    const auto cancelResult = backup.cancel();
    ASSERT_TRUE(cancelResult.has_value()) << cancelResult.error();

    ASSERT_EQ(cancelledFuture.wait_for(2s), std::future_status::ready);
    EXPECT_EQ(backup.status(), BackupStatus::Cancelled);
    EXPECT_FALSE(std::filesystem::exists(tempDirectory.path() / "working" / "43"));
}

TEST_F(FullPhysicalBackupFixture, FailureReportsErrorAndRemovesWorkingDirectory) {
    const auto scriptPath = writeExecutableScript("fake_pg_basebackup_fail.sh",
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
printf '1/2 kB (50%%), 0/1 tablespace\n' >&2
printf 'broken' > "$pgdata/base.tar"
exit 3
)");

    std::promise<std::string> failurePromise;
    auto failureFuture = failurePromise.get_future();

    ActiveBackupEvents events;
    events.onFailed = [&failurePromise](std::string message) { failurePromise.set_value(std::move(message)); };

    FullPhysicalBackup backup{
        44,
        "main",
        makeDatabaseSettings(),
        fileStorage,
        std::move(events),
        FullPhysicalBackupOptions{.executablePath = scriptPath},
    };

    const auto startResult = backup.start();
    ASSERT_TRUE(startResult.has_value()) << startResult.error();

    ASSERT_EQ(failureFuture.wait_for(2s), std::future_status::ready);
    const auto failureMessage = failureFuture.get();
    EXPECT_NE(failureMessage.find("exited with code 3"), std::string::npos);
    EXPECT_EQ(backup.status(), BackupStatus::Failed);
    EXPECT_FALSE(std::filesystem::exists(tempDirectory.path() / "working" / "44"));
}

}  // namespace
}  // namespace backup
