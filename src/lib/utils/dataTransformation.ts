/**
 * Data Transformation Utilities for Database Integration
 * 
 * This module ensures zero UI impact by transforming database structures
 * to match the exact format expected by existing UI components.
 */

import { 
  DBMenuItem, 
  DBSessionDetail, 
  DBProgressEvent, 
  DBProgressResponse,
  ApiMenuItem,
  TranslationResponse 
} from '@/types';
import { logDebug, logError } from '../config';

// ===============================================
// 📊 Menu Data Transformation
// ===============================================

/**
 * Transform database session to existing MenuData format
 * Ensures UI components receive exactly the same structure as Redis
 */
export const transformDatabaseToMenuData = (session: DBSessionDetail): Record<string, unknown[]> => {
  logDebug('Transforming database session to MenuData format:', session.session_id);
  
  const menuData: Record<string, unknown[]> = {};
  
  if (!session.menu_items || session.menu_items.length === 0) {
    logDebug('No menu items found in database session');
    return menuData;
  }

  session.menu_items.forEach(item => {
    const category = item.category || 'Other';
    
    if (!menuData[category]) {
      menuData[category] = [];
    }
    
    // Transform database item to match existing UI expectations
    const transformedItem = {
      // Core identification
      id: item.item_id,
      japanese_name: item.japanese_text,
      english_name: item.english_text || item.japanese_text,
      
      // Content fields
      description: item.description || '',
      category: item.category || 'Other',
      price: extractPriceFromDescription(item.description) || '',
      
      // Image handling
      image_url: item.image_url,
      image: getEmojiForCategory(item.category || 'Other'),
      
      // Status tracking (for existing UI logic)
      translation_status: item.translation_status,
      description_status: item.description_status,
      image_status: item.image_status,
      
      // Compatibility fields for existing components
      name: item.english_text || item.japanese_text,
      original: item.japanese_text,
      subtitle: item.english_text || '',
      
      // Additional metadata preserved from database
      providers: item.providers || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      
      // Status flags for existing UI logic
      isTranslated: item.translation_status === 'completed',
      isComplete: item.translation_status === 'completed' && 
                 item.description_status === 'completed' && 
                 item.image_status === 'completed',
      isPartiallyComplete: item.translation_status === 'completed' || 
                          item.description_status === 'completed',
      
      // Raw database data for debugging
      _dbData: item
    };
    
    menuData[category].push(transformedItem);
  });

  logDebug(`Transformed ${session.menu_items.length} items into ${Object.keys(menuData).length} categories`);
  return menuData;
};

/**
 * Transform database menu items to API menu items format
 * For backward compatibility with existing API responses
 */
export const transformDatabaseToApiMenuItems = (dbItems: DBMenuItem[]): ApiMenuItem[] => {
  return dbItems.map(item => ({
    japanese_name: item.japanese_text,
    english_name: item.english_text || '',
    description: item.description || '',
    price: extractPriceFromDescription(item.description) || ''
  }));
};

/**
 * Transform database session to TranslationResponse format
 * Ensures existing API contracts are maintained
 */
export const transformDatabaseToTranslationResponse = (session: DBSessionDetail): TranslationResponse => {
  const menuItems = transformDatabaseToApiMenuItems(session.menu_items);
  
  return {
    extracted_text: extractTextFromSession(session),
    menu_items: menuItems,
    session_id: session.session_id,
    message: `Successfully processed ${session.total_items} menu items`
  };
};

// ===============================================
// 📈 Progress Event Transformation
// ===============================================

/**
 * Transform database progress event to existing progress format
 * Ensures existing progress components receive expected data structure
 */
export const transformDatabaseProgressToUIProgress = (dbEvent: DBProgressEvent): {
  stage: number;
  status: string;
  message: string;
  data: Record<string, unknown>;
} => {
  logDebug('Transforming database progress event:', dbEvent.type);
  
  const stage = mapDatabaseEventToUIStage(dbEvent);
  const data = transformProgressEventData(dbEvent);
  
  return {
    stage,
    status: dbEvent.status,
    message: dbEvent.message,
    data
  };
};

/**
 * Map database event types to existing UI stage numbers
 */
const mapDatabaseEventToUIStage = (dbEvent: DBProgressEvent): number => {
  if (dbEvent.progress) {
    const { translation_completed, description_completed, image_completed, total_items } = dbEvent.progress;
    
    // Determine stage based on completion ratios
    if (image_completed > 0) return 5; // Image generation stage
    if (description_completed > 0) return 4; // Description stage
    if (translation_completed > 0) return 3; // Translation stage
    if (total_items > 0) return 2; // Categorization stage
  }
  
  // Event type based mapping
  switch (dbEvent.type) {
    case 'session_completed': return 6;
    case 'progress_update': return 3; // Default to translation stage
    case 'item_completed': return 4; // Item completion usually means description done
    default: return 1; // OCR stage
  }
};

/**
 * Transform database progress event data to match existing UI expectations
 */
const transformProgressEventData = (dbEvent: DBProgressEvent): Record<string, unknown> => {
  const baseData: Record<string, unknown> = {};
  
  if (dbEvent.progress) {
    const progress = dbEvent.progress;
    
    // Map to existing progress data structure
    baseData.completed_items = progress.translation_completed;
    baseData.total_items = progress.total_items;
    baseData.progress_percentage = progress.progress_percentage;
    
    // API stats for existing UI logic
    baseData.api_stats = {
      translation_completed: progress.translation_completed,
      description_completed: progress.description_completed,
      image_completed: progress.image_completed
    };
    
    // Overall progress info
    baseData.fully_completed = progress.fully_completed;
    baseData.last_updated = progress.last_updated;
  }
  
  // Add any additional event data
  if (dbEvent.data) {
    Object.assign(baseData, dbEvent.data);
  }
  
  // Item-specific data
  if (dbEvent.item) {
    baseData.completed_item = {
      japanese_name: dbEvent.item.japanese_text,
      english_name: dbEvent.item.english_text,
      description: dbEvent.item.description,
      category: dbEvent.item.category
    };
  }
  
  return baseData;
};

// ===============================================
// 🔧 Helper Functions
// ===============================================

/**
 * Extract price information from description text
 */
const extractPriceFromDescription = (description?: string): string => {
  if (!description) return '';
  
  // Look for common price patterns
  const pricePatterns = [
    /¥\s*(\d+(?:,\d{3})*)/,  // ¥1,000
    /(\d+(?:,\d{3})*)\s*円/,  // 1,000円
    /(\d+(?:,\d{3})*)\s*yen/i // 1,000 yen
  ];
  
  for (const pattern of pricePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return '';
};

/**
 * Get emoji for category (maintains existing dataStore logic)
 */
const getEmojiForCategory = (category: string): string => {
  const categoryEmojiMap: Record<string, string> = {
    'appetizers': '🥗', 'starters': '🥗', '前菜': '🥗', 'サラダ': '🥗',
    'main': '🍖', 'mains': '🍖', 'entrees': '🍖', 'メイン': '🍖', '主菜': '🍖',
    'desserts': '🍰', 'dessert': '🍰', 'sweets': '🍰', 'デザート': '🍰', '甘味': '🍰',
    'drinks': '🥤', 'beverages': '🥤', 'cocktails': '🍸', '飲み物': '🥤', 'ドリンク': '🥤',
    'sushi': '🍣', '寿司': '🍣', 'sashimi': '🍣', '刺身': '🍣',
    'noodles': '🍜', 'ramen': '🍜', 'udon': '🍜', '麺類': '🍜', 'ラーメン': '🍜',
    'rice': '🍚', 'fried rice': '🍚', 'ご飯': '🍚', '丼': '🍚',
    'soup': '🍲', 'soups': '🍲', 'スープ': '🍲', '汁物': '🍲',
    'grilled': '🔥', 'bbq': '🔥', 'barbecue': '🔥', '焼き物': '🔥', 'グリル': '🔥',
    'fried': '🍤', 'tempura': '🍤', 'katsu': '🍤', '揚げ物': '🍤', '天ぷら': '🍤',
    'hot pot': '🍲', 'shabu': '🍲', '鍋': '🍲', 'しゃぶしゃぶ': '🍲'
  };
  
  const lowerCategory = category.toLowerCase();
  for (const [key, emoji] of Object.entries(categoryEmojiMap)) {
    if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
      return emoji;
    }
  }
  return '🍽️'; // Default
};

/**
 * Extract original text from session metadata
 */
const extractTextFromSession = (session: DBSessionDetail): string => {
  // Try to get original text from metadata
  if (session.metadata?.original_text) {
    return session.metadata.original_text;
  }
  
  // Fallback: combine all Japanese text
  if (session.menu_items && session.menu_items.length > 0) {
    return session.menu_items
      .map(item => item.japanese_text)
      .join('\n');
  }
  
  return '';
};

// ===============================================
// 🔍 Data Validation
// ===============================================

/**
 * Validate that transformed data matches expected UI structure
 */
export const validateTransformedMenuData = (menuData: Record<string, unknown[]>): boolean => {
  try {
    // Check basic structure
    if (!menuData || typeof menuData !== 'object') {
      logError('Invalid menu data structure');
      return false;
    }
    
    // Validate each category
    for (const [categoryName, items] of Object.entries(menuData)) {
      if (!Array.isArray(items)) {
        logError(`Category ${categoryName} is not an array`);
        return false;
      }
      
      // Validate each item has required fields
      for (const item of items) {
        if (!validateMenuItem(item)) {
          logError(`Invalid menu item in category ${categoryName}:`, item);
          return false;
        }
      }
    }
    
    logDebug('Menu data validation passed');
    return true;
  } catch (error) {
    logError('Menu data validation failed:', error);
    return false;
  }
};

/**
 * Validate individual menu item structure
 */
const validateMenuItem = (item: unknown): boolean => {
  if (!item || typeof item !== 'object') return false;
  
  const menuItem = item as Record<string, unknown>;
  
  // Check required fields for existing UI components
  const requiredFields = ['id', 'japanese_name', 'english_name'];
  
  for (const field of requiredFields) {
    if (!(field in menuItem)) {
      logError(`Missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
};

// ===============================================
// 🧪 Testing Utilities
// ===============================================

/**
 * Create mock database session for testing
 */
export const createMockDatabaseSession = (itemCount: number = 5): DBSessionDetail => {
  const sessionId = `test_session_${Date.now()}`;
  
  return {
    session_id: sessionId,
    total_items: itemCount,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: { test_mode: true },
    menu_items: Array.from({ length: itemCount }, (_, index) => ({
      id: `item_${index}`,
      session_id: sessionId,
      item_id: index,
      japanese_text: `テストアイテム${index + 1}`,
      english_text: `Test Item ${index + 1}`,
      category: index % 2 === 0 ? 'Main Dishes' : 'Desserts',
      description: `This is a test description for item ${index + 1}`,
      image_url: `https://example.com/image_${index}.jpg`,
      translation_status: 'completed' as const,
      description_status: 'completed' as const,
      image_status: 'completed' as const,
      providers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    progress: {
      session_id: sessionId,
      total_items: itemCount,
      translation_completed: itemCount,
      description_completed: itemCount,
      image_completed: itemCount,
      fully_completed: itemCount,
      progress_percentage: 100,
      last_updated: new Date().toISOString()
    }
  };
};

/**
 * Compare transformed data with expected structure
 */
export const compareWithExpectedStructure = (
  transformed: Record<string, unknown[]>,
  expected: Record<string, unknown[]>
): { isMatch: boolean; differences: string[] } => {
  const differences: string[] = [];
  
  // Compare category names
  const transformedCategories = Object.keys(transformed).sort();
  const expectedCategories = Object.keys(expected).sort();
  
  if (JSON.stringify(transformedCategories) !== JSON.stringify(expectedCategories)) {
    differences.push(`Category mismatch: expected ${expectedCategories.join(', ')}, got ${transformedCategories.join(', ')}`);
  }
  
  // Compare item counts
  for (const category of expectedCategories) {
    const transformedCount = transformed[category]?.length || 0;
    const expectedCount = expected[category]?.length || 0;
    
    if (transformedCount !== expectedCount) {
      differences.push(`Item count mismatch in ${category}: expected ${expectedCount}, got ${transformedCount}`);
    }
  }
  
  return {
    isMatch: differences.length === 0,
    differences
  };
};

export default {
  transformDatabaseToMenuData,
  transformDatabaseToApiMenuItems,
  transformDatabaseToTranslationResponse,
  transformDatabaseProgressToUIProgress,
  validateTransformedMenuData,
  createMockDatabaseSession,
  compareWithExpectedStructure
};