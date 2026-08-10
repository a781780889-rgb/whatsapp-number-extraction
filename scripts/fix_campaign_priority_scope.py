from pathlib import Path
root=Path('/home/ubuntu/whatsapp-number-extraction')
p=root/'backend/src/db/schema.ts'
s=p.read_text()
needle='''    accountId: uuid("account_id")\n      .notNull()\n      .references(() => publishingAccounts.id, { onDelete: "cascade" }),\n    messageQuota: integer("message_quota").notNull().default(0),'''
replacement='''    accountId: uuid("account_id")\n      .notNull()\n      .references(() => publishingAccounts.id, { onDelete: "cascade" }),\n    messageQuota: integer("message_quota").notNull().default(0),\n    priority: integer("priority").notNull().default(0),'''
if needle in s and 'messageQuota: integer("message_quota").notNull().default(0),\n    priority: integer("priority")' not in s:
    s=s.replace(needle,replacement)
p.write_text(s)

p=root/'frontend/src/lib/privatePublishingApi.ts'
s=p.read_text().replace('; dailyLimit:number; lastActivityAt:string|null; priority:number','; lastActivityAt:string|null')
p.write_text(s)
