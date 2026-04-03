import type {
    Backup,
    BackupDatabase,
    BackupDeleteQuery,
    BackupListQuery,
    BackupSchedule,
    BackupScheduleAdd,
    BackupScheduleListQuery,
    BackupScheduleUpdate,
    BackupTemplate,
    BackupTemplateAdd,
    BackupTemplateListQuery,
    BackupTemplateUpdate,
    BackupVerification,
    CancelBackupResponse,
    StartBackupRequest,
    StartBackupResponse,
    VerifyBackupRequest,
} from '@Schemas'

export default interface IBackupService {
    listDatabases(): Promise<BackupDatabase[]>

    listTemplates(query?: BackupTemplateListQuery): Promise<BackupTemplate[]>

    readTemplate(templateId: number): Promise<BackupTemplate>

    createTemplate(data: BackupTemplateAdd): Promise<BackupTemplate>

    updateTemplate(
        templateId: number,
        data: BackupTemplateUpdate,
    ): Promise<BackupTemplate>

    deleteTemplate(templateId: number): Promise<null>

    startBackup(data: StartBackupRequest): Promise<StartBackupResponse>

    listBackups(query?: BackupListQuery): Promise<Backup[]>

    readBackup(backupId: number): Promise<Backup>

    deleteBackup(backupId: number, query?: BackupDeleteQuery): Promise<null>

    cancelBackup(backupId: number): Promise<CancelBackupResponse>

    verifyBackup(
        backupId: number,
        data?: VerifyBackupRequest,
    ): Promise<BackupVerification>

    listSchedules(query?: BackupScheduleListQuery): Promise<BackupSchedule[]>

    readSchedule(scheduleId: number): Promise<BackupSchedule>

    createSchedule(data: BackupScheduleAdd): Promise<BackupSchedule>

    updateSchedule(
        scheduleId: number,
        data: BackupScheduleUpdate,
    ): Promise<BackupSchedule>

    deleteSchedule(scheduleId: number): Promise<null>

    pauseSchedule(scheduleId: number): Promise<BackupSchedule>

    resumeSchedule(scheduleId: number): Promise<BackupSchedule>
}
