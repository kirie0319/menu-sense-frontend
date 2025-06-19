// Test utilities and helpers
export const createMockFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  content: string[] = ['test content']
): File => {
  return new File(content, name, { type })
}

export const createMockMenuData = () => ({
  appetizers: [
    {
      japanese_name: 'テスト前菜',
      english_name: 'Test Appetizer',
      description: 'A delicious test appetizer',
      price: '¥300'
    }
  ],
  mains: [
    {
      japanese_name: 'テストメイン',
      english_name: 'Test Main',
      description: 'A hearty test main dish',
      price: '¥800'
    }
  ],
  desserts: [
    {
      japanese_name: 'テストデザート',
      english_name: 'Test Dessert',
      description: 'A sweet test dessert',
      price: '¥400'
    }
  ]
})

export const createMockStageData = () => ({
  categories: createMockMenuData(),
  translatedCategories: createMockMenuData(),
  finalMenu: createMockMenuData(),
  realtimePartialResults: {},
  completedCategories: new Set<string>(),
  processingCategory: undefined,
  chunkProgress: undefined,
  categoryCompleted: undefined
})

export const createMockProgressStages = () => [
  { stage: 1, status: 'completed' as const, message: 'OCR - 画像からテキストを抽出' },
  { stage: 2, status: 'completed' as const, message: 'カテゴリ分析 - 日本語メニューを分析' },
  { stage: 3, status: 'active' as const, message: '翻訳 - 英語に翻訳' },
  { stage: 4, status: 'pending' as const, message: '詳細説明 - 詳細な説明を追加' },
  { stage: 5, status: 'pending' as const, message: '画像生成 - AI画像を生成' },
  { stage: 6, status: 'pending' as const, message: '完了 - 処理完了' },
]

export const createMockTranslationResponse = () => ({
  extracted_text: 'Mock extracted text from menu',
  menu_items: [
    {
      japanese_name: 'テスト料理1',
      english_name: 'Test Dish 1',
      description: 'A delicious test dish with mock ingredients',
      price: '¥500'
    },
    {
      japanese_name: 'テスト料理2',
      english_name: 'Test Dish 2',
      description: 'Another amazing test dish',
      price: '¥750'
    }
  ],
  session_id: 'mock-session-123'
})

export const createMockStore = (overrides: any = {}) => ({
  // Basic state
  isLoading: false,
  result: null,
  error: null,
  selectedFile: null,
  currentStage: 0,
  sessionId: null,
  
  // Progress stages
  progressStages: createMockProgressStages(),
  stageData: createMockStageData(),
  
  // UI state
  ui: {
    selectedCategory: 'all',
    showItemDetail: false,
    selectedItemId: null,
    favorites: new Set<string>(),
    showDebugMonitor: false,
    showRawMenu: false,
    currentView: 'categories' as const
  },
  
  // Actions
  setFile: jest.fn(),
  translateMenu: jest.fn(),
  clearResult: jest.fn(),
  clearError: jest.fn(),
  resetProgress: jest.fn(),
  setSelectedCategory: jest.fn(),
  showItemDetail: jest.fn(),
  hideItemDetail: jest.fn(),
  toggleFavorite: jest.fn(),
  toggleDebugMonitor: jest.fn(),
  toggleRawMenu: jest.fn(),
  setCurrentView: jest.fn(),
  
  // Utility functions
  getEmojiForCategory: jest.fn((category: string) => '🍽️'),
  getCurrentMenuData: jest.fn(() => createMockMenuData()),
  getFilteredItems: jest.fn(() => []),
  getCategoryList: jest.fn(() => ['appetizers', 'mains', 'desserts']),
  getMenuItemStatus: jest.fn(() => ({
    isTranslated: true,
    isComplete: false,
    isPartiallyComplete: false,
    isCurrentlyProcessing: false
  })),
  getCategoryProgress: jest.fn(() => null),
  getOverallProgress: jest.fn(() => null),
  getGeneratedImageUrl: jest.fn(() => null),
  hasGeneratedImages: jest.fn(() => false),
  
  ...overrides
})

export const mockAxiosResponse = (data: any, status: number = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
})

export const mockAxiosError = (message: string, code?: string, response?: any) => {
  const error = new Error(message) as any
  if (code) error.code = code
  if (response) error.response = response
  return error
}

// Common test patterns
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const createMockEventSource = () => ({
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: jest.fn(),
  onmessage: jest.fn(),
  onerror: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
})

export const simulateSSEMessage = (eventSource: any, data: any) => {
  const event = {
    data: JSON.stringify(data)
  }
  eventSource.onmessage?.(event)
}

export const simulateSSEError = (eventSource: any, error: any) => {
  eventSource.onerror?.(error)
} 