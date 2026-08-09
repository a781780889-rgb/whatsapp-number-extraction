import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

export function QrCodePanel({ qrCode }: { qrCode: string }) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 rounded-2xl bg-white p-4 text-center"
    >
      <img src={qrCode} alt="WhatsApp QR" className="mx-auto h-40 w-40 rounded-lg" />
      <p className="mt-2 text-xs font-semibold text-ink-800">{t('scan_qr_title')}</p>
      <p className="mt-0.5 text-[11px] text-ink-500">{t('scan_qr_hint')}</p>
    </motion.div>
  );
}
