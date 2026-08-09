// خادم بسيط لتقديم ملفات الواجهة المبنية (dist/) في الإنتاج — يُستخدم على
// Railway كخدمة Node قياسية بدل الاعتماد على ميزة استضافة ثابتة خاصة بمزوّد معيّن.
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4173;
const distPath = path.join(__dirname, 'dist');

app.use(compression());
app.use(express.static(distPath, { maxAge: '1y', index: false }));

// SPA fallback — أي مسار غير موجود كملف يُعاد توجيهه إلى index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend static server listening on port ${PORT}`);
});
