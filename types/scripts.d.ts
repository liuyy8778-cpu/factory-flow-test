declare module '@/scripts/backup-to-folder.mjs' {
  export function backupToFolder(options?: { dataDir?: string; backupDir?: string; now?: Date }): Promise<{
    target: string;
    database: string;
    size: number;
    files: number;
    created_at: string;
  }>;
}
