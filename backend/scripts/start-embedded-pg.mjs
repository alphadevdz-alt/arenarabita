import EmbeddedPostgres from 'embedded-postgres';
import { resolve } from 'node:path';

const postgres = new EmbeddedPostgres({
  databaseDir: resolve(process.cwd(), '.embedded-pg'),
  user: 'nssms',
  password: 'nssms',
  port: 5432,
  persistent: true
});

await postgres.initialise();
await postgres.start();
await postgres.createDatabase('nssms').catch(() => undefined);
console.log('embedded postgres ready on postgres://nssms:nssms@127.0.0.1:5432/nssms');
process.on('SIGINT', async () => { await postgres.stop(); process.exit(0); });
process.on('SIGTERM', async () => { await postgres.stop(); process.exit(0); });
await new Promise(() => undefined);
