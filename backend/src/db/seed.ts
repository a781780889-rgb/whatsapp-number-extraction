import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, closeDatabase } from './index.js';
import { users } from './schema.js';
import { env } from '../config/env.js';

/**
 * ينشئ مستخدم Admin أولي من متغيرات البيئة فقط — لا توجد أي بيانات اعتماد
 * مكتوبة داخل الكود. شغّل هذا السكربت مرة واحدة بعد أول migration.
 * Creates the first admin user strictly from env vars (no hardcoded
 * credentials in source). Safe to re-run — it upserts by email.
 */
async function main() {
  const existing = await db.query.users.findFirst({ where: eq(users.email, env.ADMIN_EMAIL) });
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, name: env.ADMIN_NAME, role: 'admin', isActive: true, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    console.log(`✅ Admin user updated: ${env.ADMIN_EMAIL}`);
  } else {
    await db.insert(users).values({
      email: env.ADMIN_EMAIL,
      passwordHash,
      name: env.ADMIN_NAME,
      role: 'admin',
      isActive: true,
    });
    console.log(`✅ Admin user created: ${env.ADMIN_EMAIL}`);
  }

  await closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
