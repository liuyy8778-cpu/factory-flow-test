import { backupToFolder } from '@/scripts/backup-to-folder.mjs';
import { backupDir, dataDir } from '@/lib/paths';

// 一鍵備份：把 data/ 複製到 FACTORY_BACKUP_DIR。只有選了操作人員才能按。
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return Response.json({ error: '請從本站操作' }, { status: 403 });
    if (!decodeURIComponent(req.headers.get('oai-authenticated-user-id')||'')) return Response.json({ error: '請先選擇操作人員' }, { status: 401 });
    const result = await backupToFolder({ dataDir: dataDir(), backupDir: backupDir() });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : '備份失敗' }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({ backup_dir: backupDir(), data_dir: dataDir() });
}
