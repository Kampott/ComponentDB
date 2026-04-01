#include <grpcpp/grpcpp.h>

#include <filesystem>
#include <format>
#include <iostream>
#include <memory>
#include <string>

#include "../Config/Parsers/YamlConfigParser.h"
#include "Backup/ActiveBackupManager.h"
#include "Backup/BackupCoordinator.h"
#include "Backup/LocalFileStorage.h"
#include "Backup/ScheduleManager.h"
#include "Backup/SqliteBackupDataStore.h"
#include "BackupGrpcService.h"
#include "Config.h"

int main(int argumentsCount, char* arguments[]) {
    std::filesystem::path configPath;

    if (argumentsCount < 2) {
        configPath = "config.yaml";
    } else {
        configPath = std::filesystem::path(arguments[1]);
    }

    config::YamlConfigParser<config::Config> parser{configPath};
    const auto config = parser.parse();

    if (!config) {
        std::cerr << config.error() << std::endl;
        return 1;
    }

    const auto sqlitePath = std::filesystem::path{config->backup.sqlitePath};
    const auto storageRoot = std::filesystem::path{config->backup.storageRoot};
    const auto pgBasebackupPath = std::filesystem::path{config->backup.pgBasebackupPath};

    std::error_code error;
    if (const auto parentPath = sqlitePath.parent_path(); !parentPath.empty()) {
        std::filesystem::create_directories(parentPath, error);
        if (error) {
            std::cerr << "Failed to create sqlite parent directory: " << error.message() << std::endl;
            return 1;
        }
    }

    std::filesystem::create_directories(storageRoot, error);
    if (error) {
        std::cerr << "Failed to create storage root: " << error.message() << std::endl;
        return 1;
    }

    auto dataStore = std::make_shared<backup::SqliteBackupDataStore>(sqlitePath);
    auto fileStorage = std::make_shared<backup::LocalFileStorage>(storageRoot);
    auto activeManager = std::make_shared<backup::ActiveBackupManager>();
    auto backupCoordinator = std::make_shared<backup::BackupCoordinator>(
        dataStore, activeManager, fileStorage, config->databases,
        backup::FullPhysicalBackupOptions{.executablePath = pgBasebackupPath});
    auto scheduleManager = std::make_shared<backup::ScheduleManager>(
        dataStore, [backupCoordinator](const backup::ScheduleRecord& schedule) {
            return backupCoordinator->startBackup(schedule.databaseName, schedule.templateId, schedule.scheduleId);
        });

    if (const auto workingIds = fileStorage->listWorkingIds(); workingIds) {
        for (const auto backupId : *workingIds) {
            const auto removeResult = fileStorage->remove(backupId);
            if (!removeResult) {
                std::cerr << "Failed to cleanup working backup " << backupId << ": " << removeResult.error()
                          << std::endl;
            }
        }
    } else {
        std::cerr << "Failed to list working backups: " << workingIds.error() << std::endl;
        return 1;
    }

    scheduleManager->start();

    BackupGrpcService service{
        dataStore, backupCoordinator, activeManager, scheduleManager, fileStorage, config->databases,
    };

    grpc::EnableDefaultHealthCheckService(true);
    grpc::ServerBuilder builder;
    const auto serverAddress = std::format("{}:{}", config->grpc.host, config->grpc.port);
    builder.AddListeningPort(serverAddress, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);

    auto server = builder.BuildAndStart();
    if (!server) {
        std::cerr << "Failed to start gRPC server at " << serverAddress << std::endl;
        return 1;
    }

    std::cout << "Backup gRPC server listening on " << serverAddress << std::endl;
    server->Wait();
    scheduleManager->stop();

    return 0;
}
