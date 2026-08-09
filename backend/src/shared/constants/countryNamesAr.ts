/**
 * أسماء الدول بالعربية مقابل رمز ISO 3166-1 alpha-2 الذي تُرجعه libphonenumber-js.
 * تغطي هذه القائمة كل الدول المذكورة صراحة في المواصفة بالإضافة إلى تغطية
 * واسعة لبقية دول العالم. أي دولة غير موجودة هنا يتم عرض اسمها الإنجليزي
 * كبديل بدلاً من إسقاط الرقم أو ترجمته خطأً.
 *
 * Arabic country names keyed by ISO 3166-1 alpha-2, as returned by
 * libphonenumber-js. Explicitly covers every country named in the spec, plus
 * broad world coverage. Anything missing falls back to the English name
 * rather than being mistranslated or dropped.
 */
export const COUNTRY_NAMES_AR: Record<string, string> = {
  // دول الخليج والجوار المذكورة صراحة في المواصفة
  SA: 'السعودية',
  YE: 'اليمن',
  AE: 'الإمارات',
  KW: 'الكويت',
  QA: 'قطر',
  BH: 'البحرين',
  OM: 'عُمان',
  EG: 'مصر',
  JO: 'الأردن',
  IQ: 'العراق',

  // بقية الوطن العربي
  SY: 'سوريا',
  LB: 'لبنان',
  PS: 'فلسطين',
  LY: 'ليبيا',
  TN: 'تونس',
  DZ: 'الجزائر',
  MA: 'المغرب',
  SD: 'السودان',
  SO: 'الصومال',
  DJ: 'جيبوتي',
  MR: 'موريتانيا',
  KM: 'جزر القمر',

  // دول ذات وجود مغترب عربي كبير / شائعة
  US: 'الولايات المتحدة',
  CA: 'كندا',
  GB: 'المملكة المتحدة',
  FR: 'فرنسا',
  DE: 'ألمانيا',
  IT: 'إيطاليا',
  ES: 'إسبانيا',
  TR: 'تركيا',
  IN: 'الهند',
  PK: 'باكستان',
  BD: 'بنغلاديش',
  PH: 'الفلبين',
  ID: 'إندونيسيا',
  MY: 'ماليزيا',
  CN: 'الصين',
  JP: 'اليابان',
  KR: 'كوريا الجنوبية',
  RU: 'روسيا',
  BR: 'البرازيل',
  MX: 'المكسيك',
  AU: 'أستراليا',
  ZA: 'جنوب أفريقيا',
  NG: 'نيجيريا',
  ET: 'إثيوپيا',
  KE: 'كينيا',
  GH: 'غانا',
  SN: 'السنغال',
  IR: 'إيران',
  AF: 'أفغانستان',
  NP: 'نيبال',
  LK: 'سريلانكا',
  TH: 'تايلاند',
  VN: 'فيتنام',
  SG: 'سنغافورة',
  NL: 'هولندا',
  BE: 'بلجيكا',
  CH: 'سويسرا',
  AT: 'النمسا',
  SE: 'السويد',
  NO: 'النرويج',
  DK: 'الدنمارك',
  FI: 'فنلندا',
  PL: 'بولندا',
  PT: 'البرتغال',
  GR: 'اليونان',
  UA: 'أوكرانيا',
  RO: 'رومانيا',
  IL: 'إسرائيل',
  CY: 'قبرص',
  AZ: 'أذربيجان',
  KZ: 'كازاخستان',
  UZ: 'أوزبكستان',
  AR: 'الأرجنتين',
  CL: 'تشيلي',
  CO: 'كولومبيا',
  PE: 'بيرو',
  NZ: 'نيوزيلندا',
  AE_DXB: 'الإمارات', // احتياطي غير مستخدم مباشرة من libphonenumber
};

export function getArabicCountryName(iso2: string | undefined, fallbackEn?: string): string | null {
  if (!iso2) return fallbackEn ?? null;
  return COUNTRY_NAMES_AR[iso2] ?? fallbackEn ?? iso2;
}
