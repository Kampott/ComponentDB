#include <gtest/gtest.h>

#include <atomic>
#include <memory>
#include <string>

#include "Backup/ActiveBackupManager.h"

namespace backup {
namespace {

class FakeActiveBackup final : public ActiveBackup {
public:
    explicit FakeActiveBackup(int64_t backupId) : m_backupId{backupId} {}

    int64_t id() const override { return m_backupId; }

    std::expected<void, std::string> start() override {
        m_started.store(true);
        m_status.store(BackupStatus::Running);
        return {};
    }

    std::expected<void, std::string> cancel() override {
        if (isFinished(m_status.load())) {
            return std::unexpected("already finished");
        }

        m_cancelCalls.fetch_add(1);
        m_status.store(BackupStatus::Cancelled);
        return {};
    }

    BackupStatus status() const override { return m_status.load(); }

    BackupProgress progress() const override { return {}; }

    ActiveBackupSnapshotData snapshot() const override {
        return ActiveBackupSnapshotData{
            .backupId = m_backupId,
            .databaseName = "test",
            .templateId = std::nullopt,
            .status = m_status.load(),
            .progress = {},
            .startedAt = std::nullopt,
        };
    }

    void complete() { m_status.store(BackupStatus::Completed); }
    void fail() { m_status.store(BackupStatus::Failed); }

    bool started() const { return m_started.load(); }
    int cancelCalls() const { return m_cancelCalls.load(); }

private:
    static bool isFinished(BackupStatus status) {
        return status == BackupStatus::Completed || status == BackupStatus::Failed ||
               status == BackupStatus::Cancelled;
    }

    int64_t m_backupId;
    std::atomic<BackupStatus> m_status{BackupStatus::Queued};
    std::atomic_bool m_started{false};
    std::atomic_int m_cancelCalls{0};
};

TEST(ActiveBackupManagerTests, StartRegistersAndStartsBackup) {
    ActiveBackupManager manager;
    auto backup = std::make_shared<FakeActiveBackup>(42);

    const auto startResult = manager.start(backup);

    ASSERT_TRUE(startResult.has_value()) << startResult.error();
    EXPECT_TRUE(backup->started());
    ASSERT_NE(manager.get(42), nullptr);
    ASSERT_EQ(manager.getAll().size(), 1U);
    EXPECT_EQ(manager.getAll().front()->id(), 42);
}

TEST(ActiveBackupManagerTests, StartRejectsDuplicateIds) {
    ActiveBackupManager manager;
    auto first = std::make_shared<FakeActiveBackup>(42);
    auto second = std::make_shared<FakeActiveBackup>(42);

    ASSERT_TRUE(manager.start(first).has_value());

    const auto secondStart = manager.start(second);

    ASSERT_FALSE(secondStart.has_value());
    EXPECT_NE(secondStart.error().find("already registered"), std::string::npos);
}

TEST(ActiveBackupManagerTests, CancelReturnsNotFoundForUnknownBackup) {
    ActiveBackupManager manager;

    EXPECT_EQ(manager.cancel(404), CancelActiveBackupResult::NotFound);
}

TEST(ActiveBackupManagerTests, CancelCancelsRunningBackup) {
    ActiveBackupManager manager;
    auto backup = std::make_shared<FakeActiveBackup>(42);
    ASSERT_TRUE(manager.start(backup).has_value());

    const auto result = manager.cancel(42);

    EXPECT_EQ(result, CancelActiveBackupResult::Success);
    EXPECT_EQ(backup->cancelCalls(), 1);
    EXPECT_EQ(backup->status(), BackupStatus::Cancelled);
}

TEST(ActiveBackupManagerTests, CancelReturnsAlreadyFinishedAndPrunesBackup) {
    ActiveBackupManager manager;
    auto backup = std::make_shared<FakeActiveBackup>(42);
    ASSERT_TRUE(manager.start(backup).has_value());
    backup->complete();

    const auto result = manager.cancel(42);

    EXPECT_EQ(result, CancelActiveBackupResult::AlreadyFinished);
    EXPECT_EQ(manager.get(42), nullptr);
    EXPECT_TRUE(manager.getAll().empty());
}

TEST(ActiveBackupManagerTests, GetAllPrunesFinishedBackupsLazily) {
    ActiveBackupManager manager;
    auto running = std::make_shared<FakeActiveBackup>(1);
    auto completed = std::make_shared<FakeActiveBackup>(2);
    ASSERT_TRUE(manager.start(running).has_value());
    ASSERT_TRUE(manager.start(completed).has_value());

    completed->complete();

    const auto activeBackups = manager.getAll();

    ASSERT_EQ(activeBackups.size(), 1U);
    EXPECT_EQ(activeBackups.front()->id(), 1);
}

TEST(ActiveBackupManagerTests, StartPrunesFinishedBackupBeforeReusingId) {
    ActiveBackupManager manager;
    auto completed = std::make_shared<FakeActiveBackup>(7);
    ASSERT_TRUE(manager.start(completed).has_value());
    completed->fail();

    auto replacement = std::make_shared<FakeActiveBackup>(7);

    const auto startResult = manager.start(replacement);

    ASSERT_TRUE(startResult.has_value()) << startResult.error();
    ASSERT_EQ(manager.getAll().size(), 1U);
    EXPECT_EQ(manager.getAll().front()->id(), 7);
    EXPECT_EQ(manager.getAll().front().get(), replacement.get());
}

}  // namespace
}  // namespace backup
