import type IBackupService from '@/Interfaces/Services/IBackupService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    Backup,
    BackupDatabase,
    BackupDatabasesResponse,
    BackupDeleteQuery,
    BackupListQuery,
    BackupListResponse,
    BackupSchedule,
    BackupScheduleAdd,
    BackupScheduleListQuery,
    BackupScheduleListResponse,
    BackupScheduleUpdate,
    BackupTemplate,
    BackupTemplateAdd,
    BackupTemplateListQuery,
    BackupTemplateListResponse,
    BackupTemplateUpdate,
    BackupVerification,
    CancelBackupResponse,
    StartBackupRequest,
    StartBackupResponse,
    VerifyBackupRequest,
} from '@Schemas'

export default class BackupService implements IBackupService {
    private readonly client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async listDatabases(): Promise<BackupDatabase[]> {
        const response =
            await this.client.get<BackupDatabasesResponse>('/backup/databases')
        return response.databases
    }

    public async listTemplates(
        query?: BackupTemplateListQuery,
    ): Promise<BackupTemplate[]> {
        const response = await this.client.get<BackupTemplateListResponse>(
            '/backup/templates',
            query,
        )
        return response.templates
    }

    public async readTemplate(templateId: number): Promise<BackupTemplate> {
        return await this.client.get<BackupTemplate>(
            `/backup/templates/${templateId}`,
        )
    }

    public async createTemplate(
        data: BackupTemplateAdd,
    ): Promise<BackupTemplate> {
        return await this.client.post<BackupTemplateAdd, BackupTemplate>(
            '/backup/templates',
            data,
        )
    }

    public async updateTemplate(
        templateId: number,
        data: BackupTemplateUpdate,
    ): Promise<BackupTemplate> {
        return await this.client.patch<BackupTemplateUpdate, BackupTemplate>(
            `/backup/templates/${templateId}`,
            data,
        )
    }

    public async deleteTemplate(templateId: number): Promise<null> {
        return await this.client.delete(`/backup/templates/${templateId}`)
    }

    public async startBackup(
        data: StartBackupRequest,
    ): Promise<StartBackupResponse> {
        return await this.client.post<StartBackupRequest, StartBackupResponse>(
            '/backups',
            data,
        )
    }

    public async listBackups(query?: BackupListQuery): Promise<Backup[]> {
        const response = await this.client.get<BackupListResponse>(
            '/backups',
            query,
        )
        return response.backups
    }

    public async readBackup(backupId: number): Promise<Backup> {
        return await this.client.get<Backup>(`/backups/${backupId}`)
    }

    public async deleteBackup(
        backupId: number,
        query?: BackupDeleteQuery,
    ): Promise<null> {
        return await this.client.delete(`/backups/${backupId}`, query)
    }

    public async cancelBackup(backupId: number): Promise<CancelBackupResponse> {
        return await this.client.post<
            Record<string, never>,
            CancelBackupResponse
        >(`/backups/${backupId}/cancel`, {})
    }

    public async verifyBackup(
        backupId: number,
        data: VerifyBackupRequest = {},
    ): Promise<BackupVerification> {
        return await this.client.post<VerifyBackupRequest, BackupVerification>(
            `/backups/${backupId}/verify`,
            data,
        )
    }

    public async listSchedules(
        query?: BackupScheduleListQuery,
    ): Promise<BackupSchedule[]> {
        const response = await this.client.get<BackupScheduleListResponse>(
            '/backup/schedules',
            query,
        )
        return response.schedules
    }

    public async readSchedule(scheduleId: number): Promise<BackupSchedule> {
        return await this.client.get<BackupSchedule>(
            `/backup/schedules/${scheduleId}`,
        )
    }

    public async createSchedule(
        data: BackupScheduleAdd,
    ): Promise<BackupSchedule> {
        return await this.client.post<BackupScheduleAdd, BackupSchedule>(
            '/backup/schedules',
            data,
        )
    }

    public async updateSchedule(
        scheduleId: number,
        data: BackupScheduleUpdate,
    ): Promise<BackupSchedule> {
        return await this.client.patch<BackupScheduleUpdate, BackupSchedule>(
            `/backup/schedules/${scheduleId}`,
            data,
        )
    }

    public async deleteSchedule(scheduleId: number): Promise<null> {
        return await this.client.delete(`/backup/schedules/${scheduleId}`)
    }

    public async pauseSchedule(scheduleId: number): Promise<BackupSchedule> {
        return await this.client.post<Record<string, never>, BackupSchedule>(
            `/backup/schedules/${scheduleId}/pause`,
            {},
        )
    }

    public async resumeSchedule(scheduleId: number): Promise<BackupSchedule> {
        return await this.client.post<Record<string, never>, BackupSchedule>(
            `/backup/schedules/${scheduleId}/resume`,
            {},
        )
    }
}
