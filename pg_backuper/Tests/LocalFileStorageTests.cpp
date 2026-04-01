#include <gtest/gtest.h>

#include <cstdint>
#include <filesystem>
#include <fstream>
#include <string>

#include "Backup/LocalFileStorage.h"
#include "TestSupport.h"

namespace backup {
namespace {
void writeFile(const std::filesystem::path& path, std::string_view contents) {
    std::filesystem::create_directories(path.parent_path());
    std::ofstream stream{path, std::ios::binary};
    stream << contents;
}

class LocalFileStorageFixture : public ::testing::Test {
protected:
    LocalFileStorageFixture() : tempDirectory{"pg_backuper_local_file_storage"}, storage{tempDirectory.path()} {}

    test::TempDirectory tempDirectory;
    LocalFileStorage storage;
};

TEST_F(LocalFileStorageFixture, WorkingPathCreatesDirectoryInsideWorkingRoot) {
    const auto workingPath = storage.workingPath(42);

    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    EXPECT_EQ(*workingPath, tempDirectory.path() / "working" / "42");
    EXPECT_TRUE(std::filesystem::is_directory(*workingPath));
}

TEST_F(LocalFileStorageFixture, ListWorkingIdsReturnsSortedNumericDirectoriesOnly) {
    ASSERT_TRUE(storage.workingPath(42).has_value());
    ASSERT_TRUE(storage.workingPath(7).has_value());
    std::filesystem::create_directories(tempDirectory.path() / "working" / "not-a-backup");
    writeFile(tempDirectory.path() / "working" / "file.txt", "ignored");

    const auto ids = storage.listWorkingIds();

    ASSERT_TRUE(ids.has_value()) << ids.error();
    EXPECT_EQ(*ids, (std::vector<int64_t>{7, 42}));
}

TEST_F(LocalFileStorageFixture, CommitMovesWorkingDirectoryToDatabaseDirectory) {
    const auto workingPath = storage.workingPath(42);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    writeFile(*workingPath / "base.tar", "payload");

    const auto finalPath = storage.commit(42, "main");

    ASSERT_TRUE(finalPath.has_value()) << finalPath.error();
    EXPECT_EQ(*finalPath, tempDirectory.path() / "main" / "42");
    EXPECT_FALSE(std::filesystem::exists(tempDirectory.path() / "working" / "42"));
    EXPECT_TRUE(std::filesystem::exists(*finalPath / "base.tar"));
}

TEST_F(LocalFileStorageFixture, SizeBytesSumsFilesRecursivelyForCommittedBackup) {
    const auto workingPath = storage.workingPath(9);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    writeFile(*workingPath / "a.bin", "1234");
    writeFile(*workingPath / "nested" / "b.bin", "123456");
    ASSERT_TRUE(storage.commit(9, "analytics").has_value());

    const auto sizeBytes = storage.sizeBytes(9);

    ASSERT_TRUE(sizeBytes.has_value()) << sizeBytes.error();
    EXPECT_EQ(*sizeBytes, 10U);
}

TEST_F(LocalFileStorageFixture, RemoveDeletesWorkingBackupDirectory) {
    const auto workingPath = storage.workingPath(11);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    writeFile(*workingPath / "chunk.bin", "abc");

    const auto removeResult = storage.remove(11);

    ASSERT_TRUE(removeResult.has_value()) << removeResult.error();
    EXPECT_FALSE(std::filesystem::exists(*workingPath));
}

TEST_F(LocalFileStorageFixture, RemoveDeletesCommittedBackupDirectory) {
    const auto workingPath = storage.workingPath(12);
    ASSERT_TRUE(workingPath.has_value()) << workingPath.error();
    writeFile(*workingPath / "chunk.bin", "abc");
    const auto finalPath = storage.commit(12, "main");
    ASSERT_TRUE(finalPath.has_value()) << finalPath.error();

    const auto removeResult = storage.remove(12);

    ASSERT_TRUE(removeResult.has_value()) << removeResult.error();
    EXPECT_FALSE(std::filesystem::exists(*finalPath));
}

TEST_F(LocalFileStorageFixture, MissingBackupOperationsReturnError) {
    EXPECT_FALSE(storage.commit(404, "main").has_value());
    EXPECT_FALSE(storage.sizeBytes(404).has_value());
    EXPECT_FALSE(storage.remove(404).has_value());
}
}  // namespace
}  // namespace backup
