from pathlib import Path
root=Path('/home/ubuntu/whatsapp-number-extraction')

p=root/'frontend/src/lib/privatePublishingApi.ts'
s=p.read_text()
s=s.replace('; dailyLimit:number; priority:number','')
p.write_text(s)

p=root/'frontend/src/components/private-publishing/PrivatePublishingPanel.tsx'
s=p.read_text()
s=s.replace(" const [overview,setOverview]=useState<PublishingOverview|null>(null); const [accounts,setAccounts]=useState<PublishingAccount[]>([]); const [deliveries,setDeliveries]=useState<Array<{id:string;phoneNumber:string;status:string;createdAt:string;errorMessage:string|null}>>([]); const [loading,setLoading]=useState(true); const [showAccountForm,setShowAccountForm]=useState(false); const [accountName,setAccountName]=useState(''); const [phoneNumber,setPhoneNumber]=useState(''); const [dailyLimit,setDailyLimit]=useState(100); const [priority,setPriority]=useState(0); const [saving,setSaving]=useState(false);", " const [overview,setOverview]=useState<PublishingOverview|null>(null); const [accounts,setAccounts]=useState<PublishingAccount[]>([]); const [deliveries,setDeliveries]=useState<Array<{id:string;phoneNumber:string;status:string;createdAt:string;errorMessage:string|null}>>([]); const [loading,setLoading]=useState(true); const [showAccountForm,setShowAccountForm]=useState(false); const [accountName,setAccountName]=useState(''); const [phoneNumber,setPhoneNumber]=useState(''); const [saving,setSaving]=useState(false);")
s=s.replace("<p className=\"mt-1 text-xs text-ink-400\">{a.phoneNumber} · أولوية {a.priority}</p>", "<p className=\"mt-1 text-xs text-ink-400\">{a.phoneNumber}</p>")
s=s.replace("dailyLimit,priority});", "});")
s=s.replace("<div className=\"grid gap-4 sm:grid-cols-2\"><label className=\"block text-sm font-bold text-ink-700 dark:text-paper-200\">الحد اليومي<input type=\"number\" min=\"1\" max=\"100000\" value={dailyLimit} onChange={e=>setDailyLimit(Number(e.target.value))} className=\"focus-ring mt-2 w-full rounded-xl border border-black/[0.1] bg-white/70 px-3 py-2.5 text-sm font-normal dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-paper-50\"/></label><label className=\"block text-sm font-bold text-ink-700 dark:text-paper-200\">الأولوية<input type=\"number\" min=\"0\" max=\"100\" value={priority} onChange={e=>setPriority(Number(e.target.value))} className=\"focus-ring mt-2 w-full rounded-xl border border-black/[0.1] bg-white/70 px-3 py-2.5 text-sm font-normal dark:border-white/[0.05] dark:bg-white/[0.05] dark:text-paper-50\"/></label></div>", "")
p.write_text(s)

p=root/'backend/src/modules/private-publishing/validators/schemas.ts'
s=p.read_text()
# Only remove fields from account schema blocks, not campaign account priority or campaign distribution.
s=s.replace("  dailyLimit: z.number().int().min(1).max(100000).default(100),\n  priority: z.number().int().min(0).max(100).default(0),\n});\n", "});\n")
p.write_text(s)

p=root/'backend/src/modules/private-publishing/controllers/publishing.controller.ts'
s=p.read_text()
s=s.replace("        dailyLimit: publishingAccounts.dailyLimit,\n", "").replace("        priority: publishingAccounts.priority,\n", "")
s=s.replace("; dailyLimit:number; priority:number", "")
s=s.replace(", dailyLimit: body.dailyLimit, priority: body.priority", "")
p.write_text(s)

p=root/'backend/src/db/schema.ts'
s=p.read_text()
s=s.replace('    dailyLimit: integer("daily_limit").notNull().default(100),\n','').replace('    priority: integer("priority").notNull().default(0),\n','')
p.write_text(s)

m=root/'backend/src/db/migrations/0003_remove_account_limits.sql'
m.write_text('ALTER TABLE "publishing_accounts" DROP COLUMN IF EXISTS "daily_limit";\nALTER TABLE "publishing_accounts" DROP COLUMN IF EXISTS "priority";\n')
