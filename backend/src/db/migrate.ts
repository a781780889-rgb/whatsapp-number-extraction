import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, closeDatabase } from './index.js';

async function main() {
  console.log('🔄 Running database migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('✅ Migrations complete.');
  await closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
