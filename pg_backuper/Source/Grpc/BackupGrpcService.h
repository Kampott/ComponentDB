#pragma once

#include <google/protobuf/empty.pb.h>
#include <grpcpp/grpcpp.h>

#include <map>
#include <memory>

#include "Backup/ActiveBackupManager.h"
#include "Backup/BackupCoordinator.h"
#include "Backup/BackupDataStore.h"
#include "Backup/FileStorage.h"
#include "Backup/ScheduleManager.h"
#include "Config/Config.h"
#include "backup.grpc.pb.h"

class BackupGrpcService final : public pgbackup::v1::BackupService::Service {
public:
    BackupGrpcService(std::shared_ptr<backup::BackupDataStore> dataStore,
                      std::shared_ptr<backup::BackupCoordinator> backupCoordinator,
                      std::shared_ptr<backup::ActiveBackupManager> activeManager,
                      std::shared_ptr<backup::ScheduleManager> scheduleManager,
                      std::shared_ptr<backup::FileStorage> fileStorage,
                      std::map<std::string, config::DatabaseSettings> databases);

    grpc::Status PingDatabase(grpc::ServerContext* context, const google::protobuf::Empty* request,
                              pgbackup::v1::PingDatabaseResponse* response) override;
    grpc::Status CreateBackupTemplate(grpc::ServerContext* context,
                                      const pgbackup::v1::CreateBackupTemplateRequest* request,
                                      pgbackup::v1::BackupTemplate* response) override;
    grpc::Status UpdateBackupTemplate(grpc::ServerContext* context,
                                      const pgbackup::v1::UpdateBackupTemplateRequest* request,
                                      pgbackup::v1::BackupTemplate* response) override;
    grpc::Status GetBackupTemplate(grpc::ServerContext* context, const pgbackup::v1::GetBackupTemplateRequest* request,
                                   pgbackup::v1::BackupTemplate* response) override;
    grpc::Status ListBackupTemplates(grpc::ServerContext* context,
                                     const pgbackup::v1::ListBackupTemplatesRequest* request,
                                     pgbackup::v1::ListBackupTemplatesResponse* response) override;
    grpc::Status DeleteBackupTemplate(grpc::ServerContext* context,
                                      const pgbackup::v1::DeleteBackupTemplateRequest* request,
                                      google::protobuf::Empty* response) override;

    grpc::Status StartBackup(grpc::ServerContext* context, const pgbackup::v1::StartBackupRequest* request,
                             pgbackup::v1::StartBackupResponse* response) override;
    grpc::Status CancelBackup(grpc::ServerContext* context, const pgbackup::v1::CancelBackupRequest* request,
                              pgbackup::v1::CancelBackupResponse* response) override;

    grpc::Status GetBackups(grpc::ServerContext* context, const pgbackup::v1::ListBackupsRequest* request,
                            pgbackup::v1::ListBackupsResponse* response) override;
    grpc::Status GetBackup(grpc::ServerContext* context, const pgbackup::v1::GetBackupRequest* request,
                           pgbackup::v1::Backup* response) override;
    grpc::Status DeleteBackup(grpc::ServerContext* context, const pgbackup::v1::DeleteBackupRequest* request,
                              google::protobuf::Empty* response) override;
    grpc::Status VerifyBackup(grpc::ServerContext* context, const pgbackup::v1::VerifyBackupRequest* request,
                              pgbackup::v1::BackupVerification* response) override;
    grpc::Status CreateSchedule(grpc::ServerContext* context, const pgbackup::v1::CreateScheduleRequest* request,
                                pgbackup::v1::Schedule* response) override;
    grpc::Status UpdateSchedule(grpc::ServerContext* context, const pgbackup::v1::UpdateScheduleRequest* request,
                                pgbackup::v1::Schedule* response) override;
    grpc::Status ListSchedules(grpc::ServerContext* context, const pgbackup::v1::ListSchedulesRequest* request,
                               pgbackup::v1::ListSchedulesResponse* response) override;
    grpc::Status GetSchedule(grpc::ServerContext* context, const pgbackup::v1::GetScheduleRequest* request,
                             pgbackup::v1::Schedule* response) override;
    grpc::Status DeleteSchedule(grpc::ServerContext* context, const pgbackup::v1::DeleteScheduleRequest* request,
                                google::protobuf::Empty* response) override;
    grpc::Status PauseSchedule(grpc::ServerContext* context, const pgbackup::v1::PauseScheduleRequest* request,
                               pgbackup::v1::Schedule* response) override;
    grpc::Status ResumeSchedule(grpc::ServerContext* context, const pgbackup::v1::ResumeScheduleRequest* request,
                                pgbackup::v1::Schedule* response) override;

private:
    grpc::Status makeStatus(grpc::StatusCode code, std::string message) const;
    grpc::Status makeDataStoreStatus(std::string message) const;

    pgbackup::v1::BackupTemplate toProto(const backup::BackupTemplateRecord& record) const;
    pgbackup::v1::Backup toProto(const backup::BackupRecord& record) const;
    pgbackup::v1::BackupVerification toProto(const backup::BackupVerificationRecord& record) const;
    pgbackup::v1::Backup toProto(const backup::ActiveBackupSnapshotData& snapshot) const;
    pgbackup::v1::Schedule toProto(const backup::ScheduleRecord& record) const;
    backup::BackupTemplateRecord toRecord(const pgbackup::v1::CreateBackupTemplateRequest& request) const;
    backup::BackupTemplateUpdate toUpdate(const pgbackup::v1::UpdateBackupTemplateRequest& request) const;
    backup::ListBackupsFilter toFilter(const pgbackup::v1::ListBackupsRequest& request) const;
    backup::ScheduleRecord toRecord(const pgbackup::v1::CreateScheduleRequest& request) const;
    backup::ScheduleUpdate toUpdate(const pgbackup::v1::UpdateScheduleRequest& request) const;
    void populateTemplate(const std::optional<int64_t>& templateId, pgbackup::v1::Backup* response) const;

    std::shared_ptr<backup::BackupDataStore> m_dataStore;
    std::shared_ptr<backup::BackupCoordinator> m_backupCoordinator;
    std::shared_ptr<backup::ActiveBackupManager> m_activeManager;
    std::shared_ptr<backup::ScheduleManager> m_scheduleManager;
    std::shared_ptr<backup::FileStorage> m_fileStorage;
    std::map<std::string, config::DatabaseSettings> m_databases;
};
