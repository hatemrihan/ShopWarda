/**
 * Static list of Egyptian governorates with Arabic/English names and cities.
 * Used by checkout form and admin pricing configuration.
 */

export interface GovernorateData {
  name: string;       // Arabic name (primary key)
  nameEn: string;     // English name
  cities: string[];   // Arabic city names
  subCityPricing?: boolean; // Whether per-city pricing is enabled
}

export const EGYPT_GOVERNORATES: GovernorateData[] = [
  {
    name: 'القاهرة',
    nameEn: 'Cairo',
    subCityPricing: true,
    cities: [
      'مدينة نصر', 'المعادي', 'مصر الجديدة', 'الزمالك', 'وسط البلد',
      'شبرا', 'حلوان', 'التجمع الخامس', 'القاهرة الجديدة', 'المقطم',
      'عين شمس', 'السلام', 'المرج', 'الزيتون', 'حدائق القبة',
      'باب الشعرية', 'الدرب الأحمر', 'السيدة زينب', 'منشأة ناصر', 'الوايلي',
      'الساحل', 'روض الفرج', 'بولاق', 'العتبة', '15 مايو',
    ],
  },
  {
    name: 'الجيزة',
    nameEn: 'Giza',
    subCityPricing: true,
    cities: [
      'الدقي', 'المهندسين', 'العجوزة', 'الهرم', 'فيصل',
      '6 أكتوبر', 'الشيخ زايد', 'أبو النمرس', 'البدرشين', 'العياط',
      'أطفيح', 'الصف', 'الواحات البحرية', 'كرداسة', 'أوسيم',
      'منشأة القناطر', 'الحوامدية',
    ],
  },
  {
    name: 'الإسكندرية',
    nameEn: 'Alexandria',
    cities: [
      'المنتزه', 'وسط الإسكندرية', 'الجمرك', 'العجمي', 'العامرية',
      'برج العرب', 'المعمورة', 'سيدي جابر', 'سموحة', 'ستانلي',
      'كليوباترا', 'سيدي بشر', 'المندرة', 'أبو قير',
    ],
  },
  {
    name: 'الشرقية',
    nameEn: 'Sharqia',
    cities: [
      'الزقازيق', 'العاشر من رمضان', 'بلبيس', 'منيا القمح',
      'أبو حماد', 'فاقوس', 'ههيا', 'ديرب نجم', 'أبو كبير',
      'كفر صقر', 'الحسينية', 'مشتول السوق', 'أولاد صقر',
    ],
  },
  {
    name: 'الدقهلية',
    nameEn: 'Dakahlia',
    cities: [
      'المنصورة', 'طلخا', 'ميت غمر', 'دكرنس', 'أجا',
      'السنبلاوين', 'شربين', 'بلقاس', 'منية النصر', 'المنزلة',
      'تمي الأمديد', 'الجمالية', 'نبروه',
    ],
  },
  {
    name: 'البحيرة',
    nameEn: 'Beheira',
    cities: [
      'دمنهور', 'كفر الدوار', 'رشيد', 'إيتاي البارود',
      'أبو المطامير', 'الدلنجات', 'حوش عيسى', 'شبراخيت',
      'كوم حمادة', 'المحمودية', 'إدكو', 'وادي النطرون',
    ],
  },
  {
    name: 'الغربية',
    nameEn: 'Gharbia',
    cities: [
      'طنطا', 'المحلة الكبرى', 'كفر الزيات', 'زفتى',
      'السنطة', 'قطور', 'بسيون', 'سمنود',
    ],
  },
  {
    name: 'المنوفية',
    nameEn: 'Monufia',
    cities: [
      'شبين الكوم', 'منوف', 'مدينة السادات', 'أشمون',
      'الباجور', 'قويسنا', 'بركة السبع', 'تلا', 'الشهداء',
    ],
  },
  {
    name: 'القليوبية',
    nameEn: 'Qalyubia',
    cities: [
      'بنها', 'شبرا الخيمة', 'قليوب', 'الخانكة',
      'العبور', 'القناطر الخيرية', 'طوخ', 'كفر شكر',
      'شبين القناطر',
    ],
  },
  {
    name: 'كفر الشيخ',
    nameEn: 'Kafr El Sheikh',
    cities: [
      'كفر الشيخ', 'دسوق', 'فوه', 'بيلا',
      'الرياض', 'الحامول', 'سيدي سالم', 'مطوبس', 'قلين',
    ],
  },
  {
    name: 'دمياط',
    nameEn: 'Damietta',
    cities: [
      'دمياط', 'دمياط الجديدة', 'رأس البر', 'فارسكور',
      'الزرقا', 'كفر سعد',
    ],
  },
  {
    name: 'بورسعيد',
    nameEn: 'Port Said',
    cities: ['بورسعيد', 'بورفؤاد', 'العرب', 'حي الزهور'],
  },
  {
    name: 'الإسماعيلية',
    nameEn: 'Ismailia',
    cities: [
      'الإسماعيلية', 'فايد', 'القنطرة شرق', 'القنطرة غرب',
      'التل الكبير', 'أبو صوير',
    ],
  },
  {
    name: 'السويس',
    nameEn: 'Suez',
    cities: ['السويس', 'الأربعين', 'عتاقة', 'الجناين', 'فيصل'],
  },
  {
    name: 'شمال سيناء',
    nameEn: 'North Sinai',
    cities: ['العريش', 'الشيخ زويد', 'رفح', 'بئر العبد', 'الحسنة', 'نخل'],
  },
  {
    name: 'جنوب سيناء',
    nameEn: 'South Sinai',
    cities: ['الطور', 'شرم الشيخ', 'دهب', 'نويبع', 'طابا', 'سانت كاترين', 'رأس سدر'],
  },
  {
    name: 'البحر الأحمر',
    nameEn: 'Red Sea',
    cities: ['الغردقة', 'رأس غارب', 'سفاجا', 'القصير', 'مرسى علم', 'الشلاتين', 'حلايب'],
  },
  {
    name: 'الفيوم',
    nameEn: 'Fayoum',
    cities: ['الفيوم', 'الفيوم الجديدة', 'سنورس', 'إطسا', 'طامية', 'أبشواي', 'يوسف الصديق'],
  },
  {
    name: 'بني سويف',
    nameEn: 'Beni Suef',
    cities: ['بني سويف', 'بني سويف الجديدة', 'الواسطى', 'ناصر', 'إهناسيا', 'ببا', 'الفشن', 'سمسطا'],
  },
  {
    name: 'المنيا',
    nameEn: 'Minya',
    cities: ['المنيا', 'المنيا الجديدة', 'ملوي', 'أبو قرقاص', 'سمالوط', 'مغاغة', 'بني مزار', 'دير مواس', 'العدوة'],
  },
  {
    name: 'أسيوط',
    nameEn: 'Assiut',
    cities: ['أسيوط', 'أسيوط الجديدة', 'ديروط', 'القوصية', 'منفلوط', 'أبنوب', 'الفتح', 'ساحل سليم', 'أبو تيج', 'صدفا', 'البداري'],
  },
  {
    name: 'سوهاج',
    nameEn: 'Sohag',
    cities: ['سوهاج', 'سوهاج الجديدة', 'أخميم', 'طما', 'طهطا', 'جرجا', 'المراغة', 'البلينا', 'المنشأة', 'دار السلام', 'جهينة', 'ساقلتة'],
  },
  {
    name: 'قنا',
    nameEn: 'Qena',
    cities: ['قنا', 'قنا الجديدة', 'نجع حمادي', 'دشنا', 'الوقف', 'قفط', 'قوص', 'فرشوط', 'نقادة', 'أبو تشت'],
  },
  {
    name: 'الأقصر',
    nameEn: 'Luxor',
    cities: ['الأقصر', 'الأقصر الجديدة', 'الزينية', 'البياضية', 'القرنة', 'أرمنت', 'إسنا'],
  },
  {
    name: 'أسوان',
    nameEn: 'Aswan',
    cities: ['أسوان', 'أسوان الجديدة', 'دراو', 'كوم أمبو', 'نصر النوبة', 'إدفو', 'أبو سمبل'],
  },
  {
    name: 'الوادي الجديد',
    nameEn: 'New Valley',
    cities: ['الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'],
  },
  {
    name: 'مطروح',
    nameEn: 'Matrouh',
    cities: ['مرسى مطروح', 'الحمام', 'العلمين', 'الضبعة', 'سيدي براني', 'السلوم', 'سيوة'],
  },
];

/**
 * Get the list of cities for a given governorate name (Arabic).
 */
export function getCitiesForGovernorate(governorateName: string): string[] {
  const gov = EGYPT_GOVERNORATES.find((g) => g.name === governorateName);
  return gov?.cities ?? [];
}

/**
 * Fuzzy match a text string to an Egyptian governorate.
 */
export function findGovernorateMatch(query: string): GovernorateData | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().replace(/governorate|محافظة|مبراطورية|مدينة|city/gi, '').trim();
  if (!q) return undefined;

  return EGYPT_GOVERNORATES.find((g) => {
    const nameAr = g.name.replace(/ال/, '');
    const nameEn = g.nameEn.toLowerCase();
    const qClean = q.replace(/ال/, '');
    return (
      q.includes(nameEn) ||
      nameEn.includes(q) ||
      qClean.includes(nameAr) ||
      g.name.includes(q) ||
      q.includes(g.name)
    );
  });
}
