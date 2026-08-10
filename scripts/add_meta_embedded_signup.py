from pathlib import Path

root = Path('/home/ubuntu/whatsapp-number-extraction')

env = root / 'backend/src/config/env.ts'
s = env.read_text()
needle = "  WHATSAPP_GRAPH_API_BASE_URL: z.string().url().default('https://graph.facebook.com'),"
replacement = needle + "\n  META_APP_ID: z.string().default(''),\n  META_APP_SECRET: z.string().default(''),\n  META_EMBEDDED_SIGNUP_CONFIG_ID: z.string().default(''),\n  META_EMBEDDED_SIGNUP_REDIRECT_URI: z.string().url().or(z.literal('')).default(''),"
if 'META_EMBEDDED_SIGNUP_CONFIG_ID' not in s:
    s = s.replace(needle, replacement)
env.write_text(s)

example = root / 'backend/.env.example'
s = example.read_text()
if 'META_APP_ID=' not in s:
    s += "\n# Meta Embedded Signup v4 (official WhatsApp Business onboarding)\nMETA_APP_ID=\nMETA_APP_SECRET=\nMETA_EMBEDDED_SIGNUP_CONFIG_ID=\nMETA_EMBEDDED_SIGNUP_REDIRECT_URI=https://your-dashboard.example.com/whatsapp/embedded-signup\n"
example.write_text(s)

prod = root / 'backend/.env.production.example'
s = prod.read_text()
if 'META_APP_ID=' not in s:
    s += "\nMETA_APP_ID=replace-with-meta-app-id\nMETA_APP_SECRET=replace-with-server-only-meta-app-secret\nMETA_EMBEDDED_SIGNUP_CONFIG_ID=replace-with-embedded-signup-v4-config-id\nMETA_EMBEDDED_SIGNUP_REDIRECT_URI=https://your-dashboard.example.com/whatsapp/embedded-signup\n"
prod.write_text(s)

schema = root / 'backend/src/db/schema.ts'
s = schema.read_text()
old = '''    accessTokenEncrypted: text("access_token_encrypted").notNull(),\n    status: publishingAccountStatusEnum("status").notNull().default("pending"),'''
new = '''    accessTokenEncrypted: text("access_token_encrypted").notNull(),\n    connectionProvider: varchar("connection_provider", { length: 40 }).notNull().default("meta_embedded_signup"),\n    sessionKeyEncrypted: text("session_key_encrypted"),\n    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),\n    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),\n    status: publishingAccountStatusEnum("status").notNull().default("pending"),'''
if 'connection_provider' not in s:
    s = s.replace(old, new)
schema.write_text(s)

migration = root / 'backend/src/db/migrations/0002_meta_embedded_signup.sql'
migration.write_text('''ALTER TABLE "publishing_accounts" ADD COLUMN IF NOT EXISTS "connection_provider" varchar(40) NOT NULL DEFAULT 'meta_embedded_signup';\nALTER TABLE "publishing_accounts" ADD COLUMN IF NOT EXISTS "session_key_encrypted" text;\nALTER TABLE "publishing_accounts" ADD COLUMN IF NOT EXISTS "last_connected_at" timestamptz;\nALTER TABLE "publishing_accounts" ADD COLUMN IF NOT EXISTS "disconnected_at" timestamptz;\n''')

validator = root / 'backend/src/modules/private-publishing/validators/schemas.ts'
s = validator.read_text()
if 'embeddedSignupSchema' not in s:
    s += '''\nexport const embeddedSignupSchema = z.object({\n  code: z.string().trim().min(8).max(4096),\n  name: z.string().trim().min(2).max(255),\n  phoneNumber: z.string().trim().min(8).max(32),\n  phoneNumberId: z.string().trim().min(2).max(128),\n  businessAccountId: z.string().trim().min(2).max(128),\n  dailyLimit: z.number().int().min(1).max(100000).default(100),\n  priority: z.number().int().min(0).max(100).default(0),\n});\n'''
validator.write_text(s)

routes = root / 'backend/src/modules/private-publishing/routes/index.ts'
s = routes.read_text()
s = s.replace('  createAccountSchema,', '  createAccountSchema,\n  embeddedSignupSchema,')
if 'embedded-signup' not in s:
    marker = 'privatePublishingRouter.post(\n  "/accounts",\n'
    insert = '''privatePublishingRouter.get("/embedded-signup/config", c.embeddedSignupConfig);\nprivatePublishingRouter.post(\n  "/accounts/embedded-signup",\n  requireRole("admin", "operator"),\n  validate({ body: embeddedSignupSchema }),\n  c.completeEmbeddedSignup,\n);\n'''
    s = s.replace(marker, insert + marker)
routes.write_text(s)

controller = root / 'backend/src/modules/private-publishing/controllers/publishing.controller.ts'
s = controller.read_text()
if 'completeEmbeddedSignup' not in s:
    s = s.replace('import { db } from "../../../db/index.js";', 'import { db } from "../../../db/index.js";\nimport { env } from "../../../config/env.js";\nimport { encryptSecret } from "../../number-extraction/services/crypto.service.js";')
    s += '''\nexport async function embeddedSignupConfig(_req: Request, res: Response) {\n  res.json({ success: true, data: { appId: env.META_APP_ID, configId: env.META_EMBEDDED_SIGNUP_CONFIG_ID, apiVersion: env.WHATSAPP_API_VERSION, configured: Boolean(env.META_APP_ID && env.META_EMBEDDED_SIGNUP_CONFIG_ID) } });\n}\n\nexport async function completeEmbeddedSignup(req: Request, res: Response) {\n  if (!env.META_APP_ID || !env.META_APP_SECRET) {\n    return res.status(503).json({ success: false, error: { message: "Meta Embedded Signup غير مهيأ على الخادم" } });\n  }\n  const body = req.body as { code:string; name:string; phoneNumber:string; phoneNumberId:string; businessAccountId:string; dailyLimit:number; priority:number };\n  const tokenUrl = new URL(`${env.WHATSAPP_GRAPH_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/oauth/access_token`);\n  tokenUrl.searchParams.set("client_id", env.META_APP_ID);\n  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET);\n  tokenUrl.searchParams.set("code", body.code);\n  const tokenResponse = await fetch(tokenUrl);\n  const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: { message?: string } };\n  if (!tokenResponse.ok || !tokenPayload.access_token) return res.status(502).json({ success:false, error:{ message: tokenPayload.error?.message ?? "تعذر إكمال مصادقة Meta" } });\n  const [row] = await db.insert(publishingAccounts).values({ name: body.name, phoneNumber: body.phoneNumber, phoneNumberId: body.phoneNumberId, businessAccountId: body.businessAccountId, accessTokenEncrypted: encryptSecret(tokenPayload.access_token), connectionProvider: "meta_embedded_signup", status: "connected", lastConnectedAt: new Date(), lastActivityAt: new Date(), dailyLimit: body.dailyLimit, priority: body.priority, createdBy: req.user?.sub }).returning({ id: publishingAccounts.id, name: publishingAccounts.name, phoneNumber: publishingAccounts.phoneNumber, status: publishingAccounts.status, lastConnectedAt: publishingAccounts.lastConnectedAt, createdAt: publishingAccounts.createdAt });\n  return res.status(201).json({ success:true, data: row });\n}\n'''
controller.write_text(s)
