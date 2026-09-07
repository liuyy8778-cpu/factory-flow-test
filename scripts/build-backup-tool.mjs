import {build} from 'esbuild';
import {readdirSync,readFileSync} from 'node:fs';
const migrations=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync('drizzle/'+f,'utf8'));
await build({entryPoints:['scripts/backup-restore-source.mjs'],outfile:'public/backup-restore.mjs',bundle:true,platform:'node',format:'esm',define:{__MIGRATIONS__:JSON.stringify(migrations)}});
