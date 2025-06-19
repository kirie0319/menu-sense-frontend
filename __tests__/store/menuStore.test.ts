import { act, renderHook } from '@testing-library/react'
import { useMenuStore } from '@/lib/store'
import { useProgressStore } from '@/lib/stores/progressStore'
import { MenuTranslationApi } from '@/lib/api'

// Mock the API module
jest.mock('@/lib/api', () => ({
  MenuTranslationApi: {
    translateMenuWithProgress: jest.fn(),
    healthCheck: jest.fn(),
  },
}))

const mockApi = MenuTranslationApi as jest.Mocked<typeof MenuTranslationApi>

describe('MenuStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result: menuResult } = renderHook(() => useMenuStore())
    const { result: progressResult } = renderHook(() => useProgressStore())
    act(() => {
      menuResult.current.clearResult()
      menuResult.current.clearError()
      progressResult.current.resetProgress()
    })
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      expect(menuResult.current.isLoading).toBe(false)
      expect(menuResult.current.result).toBe(null)
      expect(menuResult.current.error).toBe(null)
      expect(menuResult.current.selectedFile).toBe(null)
      expect(progressResult.current.currentStage).toBe(0)
      expect(progressResult.current.sessionId).toBe(null)
    })

    it('should have correct initial UI state', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.ui.selectedCategory).toBe('all')
      expect(result.current.ui.showItemDetail).toBe(false)
      expect(result.current.ui.selectedItemId).toBe(null)
      expect(result.current.ui.favorites).toEqual(new Set())
      expect(result.current.ui.showDebugMonitor).toBe(false)
      expect(result.current.ui.showRawMenu).toBe(false)
      expect(result.current.ui.currentView).toBe('categories')
    })

    it('should have correct initial progress stages', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.progressStages).toHaveLength(6)
      expect(result.current.progressStages[0]).toEqual({
        stage: 1,
        status: 'pending',
        message: 'OCR - 画像からテキストを抽出'
      })
      expect(result.current.progressStages[5]).toEqual({
        stage: 6,
        status: 'pending',
        message: '完了 - 処理完了'
      })
    })
  })

  describe('File Management', () => {
    it('should set file and reset progress', () => {
      const { result } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      
      act(() => {
        result.current.setFile(mockFile)
      })
      
      expect(result.current.selectedFile).toBe(mockFile)
      expect(result.current.error).toBe(null)
      expect(result.current.currentStage).toBe(0)
    })

    it('should clear file when set to null', () => {
      const { result } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      
      act(() => {
        result.current.setFile(mockFile)
      })
      
      expect(result.current.selectedFile).toBe(mockFile)
      
      act(() => {
        result.current.setFile(null)
      })
      
      expect(result.current.selectedFile).toBe(null)
    })
  })

  describe('UI Actions', () => {
    it('should update selected category', () => {
      const { result } = renderHook(() => useMenuStore())
      
      act(() => {
        result.current.setSelectedCategory('appetizers')
      })
      
      expect(result.current.ui.selectedCategory).toBe('appetizers')
    })

    it('should toggle debug monitor', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.ui.showDebugMonitor).toBe(false)
      
      act(() => {
        result.current.toggleDebugMonitor()
      })
      
      expect(result.current.ui.showDebugMonitor).toBe(true)
      
      act(() => {
        result.current.toggleDebugMonitor()
      })
      
      expect(result.current.ui.showDebugMonitor).toBe(false)
    })

    it('should show and hide item detail', () => {
      const { result } = renderHook(() => useMenuStore())
      
      act(() => {
        result.current.showItemDetail('item-123')
      })
      
      expect(result.current.ui.showItemDetail).toBe(true)
      expect(result.current.ui.selectedItemId).toBe('item-123')
      
      act(() => {
        result.current.hideItemDetail()
      })
      
      expect(result.current.ui.showItemDetail).toBe(false)
      expect(result.current.ui.selectedItemId).toBe(null)
    })

    it('should toggle favorites', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.ui.favorites.has('item-1')).toBe(false)
      
      act(() => {
        result.current.toggleFavorite('item-1')
      })
      
      expect(result.current.ui.favorites.has('item-1')).toBe(true)
      
      act(() => {
        result.current.toggleFavorite('item-1')
      })
      
      expect(result.current.ui.favorites.has('item-1')).toBe(false)
    })

    it('should set current view', () => {
      const { result } = renderHook(() => useMenuStore())
      
      act(() => {
        result.current.setCurrentView('items')
      })
      
      expect(result.current.ui.currentView).toBe('items')
      
      act(() => {
        result.current.setCurrentView('generated')
      })
      
      expect(result.current.ui.currentView).toBe('generated')
    })
  })

  describe('Progress Management', () => {
    it('should reset progress correctly', () => {
      const { result } = renderHook(() => useMenuStore())
      
      // First, set some progress state
      act(() => {
        result.current.setCurrentView('items')
        // Simulate some progress
      })
      
      act(() => {
        result.current.resetProgress()
      })
      
      expect(result.current.currentStage).toBe(0)
      expect(result.current.progressStages.every(stage => stage.status === 'pending')).toBe(true)
      expect(result.current.stageData.realtimePartialResults).toEqual({})
      expect(result.current.stageData.completedCategories).toEqual(new Set())
    })
  })

  describe('Utility Functions', () => {
    it('should get emoji for category', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.getEmojiForCategory('appetizers')).toBe('🥗')
      expect(result.current.getEmojiForCategory('main')).toBe('🍖')
      expect(result.current.getEmojiForCategory('dessert')).toBe('🍰')
      expect(result.current.getEmojiForCategory('drinks')).toBe('🥤')
      expect(result.current.getEmojiForCategory('unknown')).toBe('🍽️')
    })

    it('should return null for getCurrentMenuData when no data', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.getCurrentMenuData()).toBe(null)
    })

    it('should return empty array for getFilteredItems when no data', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.getFilteredItems()).toEqual([])
    })

    it('should return empty array for getCategoryList when no data', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.getCategoryList()).toEqual([])
    })
  })

  describe('Translation Process', () => {
    it('should handle translation when no file selected', async () => {
      const { result } = renderHook(() => useMenuStore())
      
      await act(async () => {
        await result.current.translateMenu()
      })
      
      expect(result.current.error).toBe('Please select a file first')
      expect(mockApi.translateMenuWithProgress).not.toHaveBeenCalled()
    })

    it('should prevent duplicate translation requests', async () => {
      const { result } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      
      // Mock a long-running translation
      mockApi.translateMenuWithProgress.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )
      
      act(() => {
        result.current.setFile(mockFile)
      })
      
      // Start first translation
      const promise1 = act(async () => {
        await result.current.translateMenu()
      })
      
      // Try to start second translation while first is running
      const promise2 = act(async () => {
        await result.current.translateMenu()
      })
      
      await Promise.all([promise1, promise2])
      
      // Should only be called once
      expect(mockApi.translateMenuWithProgress).toHaveBeenCalledTimes(1)
    })

    it('should handle translation success', async () => {
      const { result } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      const mockResult = {
        extracted_text: 'Mock extracted text',
        menu_items: [
          {
            japanese_name: 'テスト料理',
            english_name: 'Test Dish',
            description: 'A test dish',
            price: '¥500'
          }
        ],
        session_id: 'test-session-123'
      }
      
      mockApi.translateMenuWithProgress.mockResolvedValue(mockResult)
      
      act(() => {
        result.current.setFile(mockFile)
      })
      
      await act(async () => {
        await result.current.translateMenu()
      })
      
      expect(result.current.result).toEqual(mockResult)
      expect(result.current.sessionId).toBe('test-session-123')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle translation error', async () => {
      const { result } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      const errorMessage = 'Translation failed'
      
      mockApi.translateMenuWithProgress.mockRejectedValue(new Error(errorMessage))
      
      act(() => {
        result.current.setFile(mockFile)
      })
      
      await act(async () => {
        await result.current.translateMenu()
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.result).toBe(null)
    })
  })

  describe('Error Management', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useMenuStore())
      
      // Set an error first
      act(() => {
        result.current.setFile(null)
      })
      
      act(() => {
        result.current.translateMenu()
      })
      
      expect(result.current.error).toBe('Please select a file first')
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBe(null)
    })

    it('should clear result and reset progress', () => {
      const { result } = renderHook(() => useMenuStore())
      
      // Simulate having some result
      act(() => {
        result.current.setFile(new File(['test'], 'menu.jpg', { type: 'image/jpeg' }))
      })
      
      act(() => {
        result.current.clearResult()
      })
      
      expect(result.current.result).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.currentStage).toBe(0)
    })
  })

  describe('Stage Data Management', () => {
    it('should handle stage data without menu data', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.getCurrentMenuData()).toBe(null)
      expect(result.current.getFilteredItems()).toEqual([])
      expect(result.current.getCategoryList()).toEqual([])
    })

    it('should return null for menu item status when stage < 4', () => {
      const { result } = renderHook(() => useMenuStore())
      const mockItem = { english_name: 'Test Item' }
      
      const status = result.current.getMenuItemStatus(mockItem, 'appetizers')
      
      expect(status.isComplete).toBe(false)
      expect(status.isPartiallyComplete).toBe(false)
      expect(status.isCurrentlyProcessing).toBe(false)
    })

    it('should return null for category progress when stage < 4', () => {
      const { result } = renderHook(() => useMenuStore())
      
      const progress = result.current.getCategoryProgress('appetizers')
      
      expect(progress).toBe(null)
    })

    it('should return null for overall progress when no menu data', () => {
      const { result } = renderHook(() => useMenuStore())
      
      const progress = result.current.getOverallProgress()
      
      expect(progress).toBe(null)
    })
  })

  describe('Image Generation', () => {
    it('should return false for hasGeneratedImages when no images', () => {
      const { result } = renderHook(() => useMenuStore())
      
      expect(result.current.hasGeneratedImages()).toBe(false)
    })

    it('should return null for getGeneratedImageUrl when no images', () => {
      const { result } = renderHook(() => useMenuStore())
      const mockItem = { english_name: 'Test Item' }
      
      expect(result.current.getGeneratedImageUrl(mockItem)).toBe(null)
    })
  })
}) 