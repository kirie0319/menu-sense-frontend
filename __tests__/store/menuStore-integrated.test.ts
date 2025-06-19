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

describe('Integrated MenuStore + ProgressStore', () => {
  beforeEach(() => {
    // Reset both stores before each test
    const { result: menuResult } = renderHook(() => useMenuStore())
    const { result: progressResult } = renderHook(() => useProgressStore())
    act(() => {
      menuResult.current.clearResult()
      menuResult.current.clearError()
      progressResult.current.resetProgress()
    })
    jest.clearAllMocks()
  })

  describe('Initial State Integration', () => {
    it('should have correct initial state across both stores', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      // MenuStore state
      expect(menuResult.current.isLoading).toBe(false)
      expect(menuResult.current.result).toBe(null)
      expect(menuResult.current.error).toBe(null)
      expect(menuResult.current.selectedFile).toBe(null)
      
      // ProgressStore state  
      expect(progressResult.current.currentStage).toBe(0)
      expect(progressResult.current.sessionId).toBe(null)
      expect(progressResult.current.progressStages).toHaveLength(6)
      
      // UI state
      expect(menuResult.current.ui.selectedCategory).toBe('all')
      expect(menuResult.current.ui.showItemDetail).toBe(false)
      expect(menuResult.current.ui.selectedItemId).toBe(null)
      expect(menuResult.current.ui.favorites).toEqual(new Set())
      expect(menuResult.current.ui.showDebugMonitor).toBe(false)
      expect(menuResult.current.ui.showRawMenu).toBe(false)
      expect(menuResult.current.ui.currentView).toBe('categories')
    })

    it('should have correct initial progress stages', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      expect(progressResult.current.progressStages).toHaveLength(6)
      expect(progressResult.current.progressStages[0]).toEqual({
        stage: 1,
        status: 'pending',
        message: 'OCR - 画像からテキストを抽出'
      })
      expect(progressResult.current.progressStages[5]).toEqual({
        stage: 6,
        status: 'pending',
        message: '完了 - 処理完了'
      })
    })
  })

  describe('File Management Integration', () => {
    it('should set file and reset progress in both stores', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const { result: progressResult } = renderHook(() => useProgressStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      
      act(() => {
        menuResult.current.setFile(mockFile)
      })
      
      expect(menuResult.current.selectedFile).toBe(mockFile)
      expect(menuResult.current.error).toBe(null)
      expect(progressResult.current.currentStage).toBe(0)
    })

    it('should clear file when set to null', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      
      act(() => {
        menuResult.current.setFile(mockFile)
      })
      
      expect(menuResult.current.selectedFile).toBe(mockFile)
      
      act(() => {
        menuResult.current.setFile(null)
      })
      
      expect(menuResult.current.selectedFile).toBe(null)
    })
  })

  describe('UI Actions', () => {
    it('should update selected category', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      act(() => {
        menuResult.current.setSelectedCategory('appetizers')
      })
      
      expect(menuResult.current.ui.selectedCategory).toBe('appetizers')
    })

    it('should toggle debug monitor', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.ui.showDebugMonitor).toBe(false)
      
      act(() => {
        menuResult.current.toggleDebugMonitor()
      })
      
      expect(menuResult.current.ui.showDebugMonitor).toBe(true)
      
      act(() => {
        menuResult.current.toggleDebugMonitor()
      })
      
      expect(menuResult.current.ui.showDebugMonitor).toBe(false)
    })

    it('should show and hide item detail', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      act(() => {
        menuResult.current.showItemDetail('item-123')
      })
      
      expect(menuResult.current.ui.showItemDetail).toBe(true)
      expect(menuResult.current.ui.selectedItemId).toBe('item-123')
      
      act(() => {
        menuResult.current.hideItemDetail()
      })
      
      expect(menuResult.current.ui.showItemDetail).toBe(false)
      expect(menuResult.current.ui.selectedItemId).toBe(null)
    })

    it('should toggle favorites', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.ui.favorites.has('item-1')).toBe(false)
      
      act(() => {
        menuResult.current.toggleFavorite('item-1')
      })
      
      expect(menuResult.current.ui.favorites.has('item-1')).toBe(true)
      
      act(() => {
        menuResult.current.toggleFavorite('item-1')
      })
      
      expect(menuResult.current.ui.favorites.has('item-1')).toBe(false)
    })

    it('should set current view', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      act(() => {
        menuResult.current.setCurrentView('items')
      })
      
      expect(menuResult.current.ui.currentView).toBe('items')
      
      act(() => {
        menuResult.current.setCurrentView('generated')
      })
      
      expect(menuResult.current.ui.currentView).toBe('generated')
    })
  })

  describe('Progress Management Integration', () => {
    it('should reset progress correctly in ProgressStore', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      act(() => {
        progressResult.current.resetProgress()
      })
      
      expect(progressResult.current.currentStage).toBe(0)
      expect(progressResult.current.progressStages.every(stage => stage.status === 'pending')).toBe(true)
      expect(progressResult.current.stageData.realtimePartialResults).toEqual({})
      expect(progressResult.current.stageData.completedCategories).toEqual(new Set())
    })

    it('should update progress through ProgressStore', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      act(() => {
        progressResult.current.updateProgress(2, 'active', 'Testing stage 2', { test: true })
      })
      
      expect(progressResult.current.currentStage).toBe(2)
      expect(progressResult.current.progressStages[1].status).toBe('active')
      expect(progressResult.current.progressStages[1].message).toBe('Testing stage 2')
    })
  })

  describe('Utility Functions', () => {
    it('should get emoji for category', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.getEmojiForCategory('appetizers')).toBe('🥗')
      expect(menuResult.current.getEmojiForCategory('main')).toBe('🍖')
      expect(menuResult.current.getEmojiForCategory('dessert')).toBe('🍰')
      expect(menuResult.current.getEmojiForCategory('drinks')).toBe('🥤')
      expect(menuResult.current.getEmojiForCategory('unknown')).toBe('🍽️')
    })

    it('should return null for getCurrentMenuData when no data', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.getCurrentMenuData()).toBe(null)
    })

    it('should return empty array for getFilteredItems when no data', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.getFilteredItems()).toEqual([])
    })

    it('should return empty array for getCategoryList when no data', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.getCategoryList()).toEqual([])
    })
  })

  describe('Translation Process Integration', () => {
    it('should handle translation when no file selected', async () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      await act(async () => {
        await menuResult.current.translateMenu()
      })
      
      expect(menuResult.current.error).toBe('Please select a file first')
      expect(mockApi.translateMenuWithProgress).not.toHaveBeenCalled()
    })

    it('should handle translation success with ProgressStore integration', async () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const { result: progressResult } = renderHook(() => useProgressStore())
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
        menuResult.current.setFile(mockFile)
      })
      
      await act(async () => {
        await menuResult.current.translateMenu()
      })
      
      expect(menuResult.current.result).toEqual(mockResult)
      expect(progressResult.current.sessionId).toBe('test-session-123')
      expect(menuResult.current.isLoading).toBe(false)
      expect(menuResult.current.error).toBe(null)
    })

    it('should handle translation error', async () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const mockFile = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
      const errorMessage = 'Translation failed'
      
      mockApi.translateMenuWithProgress.mockRejectedValue(new Error(errorMessage))
      
      act(() => {
        menuResult.current.setFile(mockFile)
      })
      
      await act(async () => {
        await menuResult.current.translateMenu()
      })
      
      expect(menuResult.current.error).toBe(errorMessage)
      expect(menuResult.current.isLoading).toBe(false)
      expect(menuResult.current.result).toBe(null)
    })
  })

  describe('Error Management', () => {
    it('should clear error', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      // Set an error first
      act(() => {
        menuResult.current.setFile(null)
      })
      
      act(() => {
        menuResult.current.translateMenu()
      })
      
      expect(menuResult.current.error).toBe('Please select a file first')
      
      act(() => {
        menuResult.current.clearError()
      })
      
      expect(menuResult.current.error).toBe(null)
    })

    it('should clear result and reset progress', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      // Simulate having some result
      act(() => {
        menuResult.current.setFile(new File(['test'], 'menu.jpg', { type: 'image/jpeg' }))
      })
      
      act(() => {
        menuResult.current.clearResult()
      })
      
      expect(menuResult.current.result).toBe(null)
      expect(menuResult.current.error).toBe(null)
      expect(progressResult.current.currentStage).toBe(0)
    })
  })

  describe('Progress Store Specific Features', () => {
    it('should handle menu item status from ProgressStore', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const mockItem = { english_name: 'Test Item' }
      
      const status = progressResult.current.getMenuItemStatus(mockItem, 'appetizers')
      
      expect(status.isComplete).toBe(false)
      expect(status.isPartiallyComplete).toBe(false)
      expect(status.isCurrentlyProcessing).toBe(false)
    })

    it('should handle category progress from ProgressStore', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      const progress = progressResult.current.getCategoryProgress('appetizers')
      
      expect(progress).toBe(null)
    })

    it('should handle overall progress from ProgressStore', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      
      const progress = progressResult.current.getOverallProgress()
      
      expect(progress).toBe(null)
    })
  })

  describe('Image Generation from ProgressStore', () => {
    it('should return false for hasGeneratedImages when no images', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      
      expect(menuResult.current.hasGeneratedImages()).toBe(false)
    })

    it('should return null for getGeneratedImageUrl when no images', () => {
      const { result: menuResult } = renderHook(() => useMenuStore())
      const mockItem = { english_name: 'Test Item' }
      
      expect(menuResult.current.getGeneratedImageUrl(mockItem)).toBe(null)
    })
  })
}) 