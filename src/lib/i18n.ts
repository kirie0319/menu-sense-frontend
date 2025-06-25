// Simple i18n system for multilingual support
export type Language = 'en' | 'ja';

export const translations = {
  en: {
    // UI Elements
    tapForDetails: 'Tap for details',
    details: 'Details',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    
    // Menu Categories
    menuCategories: 'Menu Categories',
    allCategories: 'All',
    
    // Menu Item Details
    description: 'Description',
    spiceLevel: 'Spice Level',
    allergenInformation: 'Allergen Information',
    mainIngredients: 'Main Ingredients',
    cookingMethod: 'Cooking Method',
    culturalBackground: 'Cultural Background',
    tags: 'Tags',
    
    // Spice levels
    mild: 'Mild',
    medium: 'Medium',
    spicy: 'Spicy',
    verySpicy: 'Very Spicy',
    
    // Messages
    noMenuItemsFound: 'No menu items found',
    tryDifferentCategory: 'Try selecting a different category',
    pleaseTellStaffAboutAllergies: '⚠️ Please inform staff of any allergies before ordering',
    askStaffForIngredients: 'Please ask staff for detailed ingredient information',
    askStaffForCookingMethod: 'Please ask staff about preparation methods',
    askStaffForCulturalNote: 'Ask our staff about the cultural background and traditional preparation of this dish',
    defaultAllergens: 'Soy, Gluten, Please ask staff',
    
    // Price
    priceTBD: 'Price TBD',
  },
  ja: {
    // UI Elements
    tapForDetails: 'タップして詳細',
    details: '詳細',
    addToFavorites: 'お気に入りに追加',
    removeFromFavorites: 'お気に入りから削除',
    
    // Menu Categories
    menuCategories: 'メニューカテゴリ',
    allCategories: 'すべて',
    
    // Menu Item Details
    description: '説明',
    spiceLevel: '辛さレベル',
    allergenInformation: 'アレルギー情報',
    mainIngredients: '主な材料',
    cookingMethod: '調理方法',
    culturalBackground: '文化的背景',
    tags: 'タグ',
    
    // Spice levels
    mild: 'マイルド',
    medium: '中辛',
    spicy: '辛口',
    verySpicy: '激辛',
    
    // Messages
    noMenuItemsFound: 'メニューが見つかりませんでした',
    tryDifferentCategory: '別のカテゴリを選択してください',
    pleaseTellStaffAboutAllergies: '⚠️ ご注文前にアレルギーについてスタッフにお知らせください',
    askStaffForIngredients: '詳細な材料情報についてはスタッフにお尋ねください',
    askStaffForCookingMethod: '調理方法についてはスタッフにお尋ねください',
    askStaffForCulturalNote: 'この料理の文化的背景や伝統的な調理法については、スタッフにお尋ねください',
    defaultAllergens: '大豆、グルテン、詳細はスタッフまで',
    
    // Price
    priceTBD: '価格未定',
  }
} as const;

// Detect browser language
const detectBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language.toLowerCase();
  
  // Check for Japanese
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  
  // Default to English
  return 'en';
};

// Current language state
let currentLanguage: Language = detectBrowserLanguage();

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  // Store in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('menu-app-language', lang);
  }
};

export const getCurrentLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    // First check localStorage
    const stored = localStorage.getItem('menu-app-language') as Language;
    if (stored && ['en', 'ja'].includes(stored)) {
      currentLanguage = stored;
      return stored;
    }
    
    // If no stored preference, use browser detection
    currentLanguage = detectBrowserLanguage();
  }
  return currentLanguage;
};

export const t = (key: keyof typeof translations.en): string => {
  const lang = getCurrentLanguage();
  return translations[lang][key] || translations.en[key] || key;
};

export const getSpiceLevelText = (level: number): string => {
  if (level >= 4) return t('verySpicy');
  if (level >= 3) return t('spicy');
  if (level >= 2) return t('medium');
  return t('mild');
}; 