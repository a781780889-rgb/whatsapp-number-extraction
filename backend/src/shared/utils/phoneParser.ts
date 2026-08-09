import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getArabicCountryName } from '../constants/countryNamesAr.js';

export interface ParsedPhoneDetails {
  e164: string; // مثال: +966501234567
  digitsOnly: string; // بدون علامة +
  countryIso: string | null; // SA, YE, ...
  countryCallingCode: string | null; // 966, 967, ...
  countryNameEn: string | null;
  countryNameAr: string | null;
  isValid: boolean;
}

/**
 * أنواع الـ JID المعروفة في واتساب / Baileys:
 *  - user@s.whatsapp.net   -> رقم هاتف حقيقي (الحالة العادية)
 *  - user@c.us              -> صيغة قديمة مكافئة لـ s.whatsapp.net
 *  - opaque@lid              -> "Linked ID" الخاص بنظام الخصوصية الجديد في واتساب،
 *                               لا يكشف رقم الهاتف مباشرة (راجع whatsappConnection.service
 *                               لمحاولة الحل عبر lidMapping عند توفرها)
 *  - anything@g.us            -> معرّف مجموعة، ليس مستخدماً
 *  - anything@broadcast       -> قوائم بث/حالة، ليست مستخدماً حقيقياً
 */
export type JidKind = 'phone' | 'lid' | 'group' | 'broadcast' | 'unknown';

export function classifyJid(jid: string): JidKind {
  if (!jid || typeof jid !== 'string') return 'unknown';
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us')) return 'phone';
  if (jid.endsWith('@lid')) return 'lid';
  if (jid.endsWith('@g.us')) return 'group';
  if (jid.endsWith('@broadcast')) return 'broadcast';
  return 'unknown';
}

/**
 * يستخرج الأرقام فقط من جزء المستخدم داخل JID من نوع phone. يُعيد null لأي
 * صيغة أخرى (يجب فحصها أولاً عبر classifyJid قبل استدعاء هذه الدالة).
 */
export function extractDigitsFromPhoneJid(jid: string): string | null {
  if (classifyJid(jid) !== 'phone') return null;
  const userPart = jid.split('@')[0]?.split(':')[0]; // يزيل device suffix مثل 12345:1
  if (!userPart) return null;
  const digits = userPart.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) return null; // نطاق E.164 المعقول
  return digits;
}

/**
 * يحلل رقماً مكوناً من أرقام فقط (بدون +) إلى تفاصيل الدولة باستخدام
 * libphonenumber-js، مع اسم الدولة بالعربية والإنجليزية.
 */
export function parsePhoneDetails(digitsOnly: string): ParsedPhoneDetails | null {
  if (!digitsOnly || !/^[0-9]{7,15}$/.test(digitsOnly)) return null;

  const e164 = `+${digitsOnly}`;
  const parsed = parsePhoneNumberFromString(e164);

  if (!parsed) {
    return {
      e164,
      digitsOnly,
      countryIso: null,
      countryCallingCode: null,
      countryNameEn: null,
      countryNameAr: null,
      isValid: false,
    };
  }

  const countryNameEn = parsed.country ? regionNameEn(parsed.country) : null;

  return {
    e164: parsed.number,
    digitsOnly,
    countryIso: parsed.country ?? null,
    countryCallingCode: parsed.countryCallingCode ?? null,
    countryNameEn,
    countryNameAr: getArabicCountryName(parsed.country, countryNameEn ?? undefined),
    isValid: parsed.isValid(),
  };
}

// Intl.DisplayNames يعطينا اسم الدولة بالإنجليزية دون الحاجة لجدول ثابت إضافي
let displayNames: Intl.DisplayNames | null = null;
function regionNameEn(iso2: string): string | null {
  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}

/**
 * دالة مساعدة شاملة: من JID كامل إلى تفاصيل الرقم مباشرة، أو null إذا لم يكن
 * قابلاً للاستخراج (مجموعة، بث، أو LID غير محلول).
 */
export function parsePhoneFromJid(jid: string): ParsedPhoneDetails | null {
  const digits = extractDigitsFromPhoneJid(jid);
  if (!digits) return null;
  return parsePhoneDetails(digits);
}
