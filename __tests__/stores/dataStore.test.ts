import { act, renderHook } from '@testing-library/react'
import { useDataStore } from '@/lib/stores/dataStore'
import { useProgressStore } from '@/lib/stores/progressStore'
import { useUIStore } from '@/lib/stores/uiStore'

describe('DataStore', () => {
  beforeEach(() => {
    // Reset all stores before each test
    const { result: progressResult } = renderHook(() => useProgressStore())
    const { result: uiResult } = renderHook(() => useUIStore())
    act(() => {
      progressResult.current.resetProgress()
      // UI Store を初期状態にリセット
      uiResult.current.setSelectedCategory('all')
      uiResult.current.hideItemDetail()
      uiResult.current.setCurrentView('categories')
    })
  })

  describe('getCurrentMenuData', () => {
    it('should return null when no data is available', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getCurrentMenuData()).toBe(null)
    })

    it('should return stage 2 categories data', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockCategories = {
        'appetizers': [{ name: 'サラダ' }],
        'mains': [{ name: '寿司' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(2, 'completed', 'Categories analyzed', {
          categories: mockCategories
        })
      })
      
      const menuData = dataResult.current.getCurrentMenuData()
      expect(menuData).toEqual(mockCategories)
    })

    it('should return stage 3 translated data when available', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockTranslatedData = {
        'appetizers': [{ japanese_name: 'サラダ', english_name: 'Salad' }],
        'mains': [{ japanese_name: '寿司', english_name: 'Sushi' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(3, 'completed', 'Translation completed', {
          translatedCategories: mockTranslatedData,
          show_translated_menu: true
        })
      })
      
      const menuData = dataResult.current.getCurrentMenuData()
      expect(menuData).toEqual(mockTranslatedData)
    })

    it('should return stage 4 final menu when available', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockFinalData = {
        'appetizers': [{ 
          japanese_name: 'サラダ', 
          english_name: 'Salad',
          description: 'Fresh mixed salad' 
        }]
      }
      
      act(() => {
        progressResult.current.updateProgress(4, 'completed', 'Details added', {
          finalMenu: mockFinalData
        })
      })
      
      const menuData = dataResult.current.getCurrentMenuData()
      expect(menuData).toEqual(mockFinalData)
    })

    it('should return stage 5 final menu with images when available', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockFinalDataWithImages = {
        'appetizers': [{ 
          japanese_name: 'サラダ', 
          english_name: 'Salad',
          description: 'Fresh mixed salad',
          image_url: '/uploads/salad.jpg'
        }]
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'completed', 'Images generated', {
          final_menu_with_images: mockFinalDataWithImages
        })
      })
      
      const menuData = dataResult.current.getCurrentMenuData()
      expect(menuData).toEqual(mockFinalDataWithImages)
    })
  })

  describe('getFilteredItems', () => {
    it('should return empty array when no menu data', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getFilteredItems()).toEqual([])
    })

    it('should return all items when selectedCategory is "all"', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: uiResult } = renderHook(() => useUIStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockCategories = {
        'appetizers': [{ name: 'サラダ' }],
        'mains': [{ name: '寿司' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(2, 'completed', 'Categories analyzed', {
          categories: mockCategories
        })
        uiResult.current.setSelectedCategory('all')
      })
      
      const items = dataResult.current.getFilteredItems()
      expect(items).toEqual([{ name: 'サラダ' }, { name: '寿司' }])
    })

    it('should return items from specific category when selected', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: uiResult } = renderHook(() => useUIStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockCategories = {
        'appetizers': [{ name: 'サラダ' }],
        'mains': [{ name: '寿司' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(2, 'completed', 'Categories analyzed', {
          categories: mockCategories
        })
        uiResult.current.setSelectedCategory('appetizers')
      })
      
      const items = dataResult.current.getFilteredItems()
      expect(items).toEqual([{ name: 'サラダ' }])
    })

    it('should return empty array for non-existent category', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: uiResult } = renderHook(() => useUIStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockCategories = {
        'appetizers': [{ name: 'サラダ' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(2, 'completed', 'Categories analyzed', {
          categories: mockCategories
        })
        uiResult.current.setSelectedCategory('nonexistent')
      })
      
      const items = dataResult.current.getFilteredItems()
      expect(items).toEqual([])
    })
  })

  describe('getCategoryList', () => {
    it('should return empty array when no menu data', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getCategoryList()).toEqual([])
    })

    it('should return category keys when menu data is available', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockCategories = {
        'appetizers': [{ name: 'サラダ' }],
        'mains': [{ name: '寿司' }],
        'desserts': [{ name: 'アイス' }]
      }
      
      act(() => {
        progressResult.current.updateProgress(2, 'completed', 'Categories analyzed', {
          categories: mockCategories
        })
      })
      
      const categories = dataResult.current.getCategoryList()
      expect(categories).toEqual(['appetizers', 'mains', 'desserts'])
    })
  })

  describe('getEmojiForCategory', () => {
    it('should return correct emoji for known categories', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getEmojiForCategory('appetizers')).toBe('🥗')
      expect(result.current.getEmojiForCategory('main')).toBe('🍖')
      expect(result.current.getEmojiForCategory('dessert')).toBe('🍰')
      expect(result.current.getEmojiForCategory('drinks')).toBe('🥤')
      expect(result.current.getEmojiForCategory('sushi')).toBe('🍣')
    })

    it('should return default emoji for unknown categories', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getEmojiForCategory('unknown')).toBe('🍽️')
      expect(result.current.getEmojiForCategory('random')).toBe('🍽️')
    })

    it('should handle case insensitive matching', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getEmojiForCategory('APPETIZERS')).toBe('🥗')
      expect(result.current.getEmojiForCategory('Main')).toBe('🍖')
      expect(result.current.getEmojiForCategory('DeSsErT')).toBe('🍰')
    })

    it('should handle partial matching', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.getEmojiForCategory('appetizer')).toBe('🥗')
      expect(result.current.getEmojiForCategory('starter')).toBe('🥗')
      expect(result.current.getEmojiForCategory('前菜')).toBe('🥗')
    })
  })

  describe('hasGeneratedImages', () => {
    it('should return false when no images generated', () => {
      const { result } = renderHook(() => useDataStore())
      
      expect(result.current.hasGeneratedImages()).toBe(false)
    })

    it('should return true when images are available', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockImagesGenerated = {
        'appetizers': [
          {
            english_name: 'Salad',
            image_url: '/uploads/salad.jpg',
            generation_success: true
          }
        ]
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'active', 'Generating images', {
          images_generated: mockImagesGenerated
        })
      })
      
      expect(dataResult.current.hasGeneratedImages()).toBe(true)
    })

    it('should return false when images array is empty', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockImagesGenerated = {
        'appetizers': []
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'active', 'Generating images', {
          images_generated: mockImagesGenerated
        })
      })
      
      expect(dataResult.current.hasGeneratedImages()).toBe(false)
    })
  })

  describe('getGeneratedImageUrl', () => {
    it('should return null when no images generated', () => {
      const { result } = renderHook(() => useDataStore())
      const mockItem = { english_name: 'Salad' }
      
      expect(result.current.getGeneratedImageUrl(mockItem)).toBe(null)
    })

    it('should return null when item has no name', () => {
      const { result } = renderHook(() => useDataStore())
      const mockItem = {}
      
      expect(result.current.getGeneratedImageUrl(mockItem)).toBe(null)
    })

    it('should return image URL when exact match found', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockImagesGenerated = {
        'appetizers': [
          {
            english_name: 'Fresh Salad',
            image_url: '/uploads/fresh_salad.jpg',
            generation_success: true
          }
        ]
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'active', 'Generating images', {
          images_generated: mockImagesGenerated
        })
      })
      
      const mockItem = { english_name: 'Fresh Salad' }
      const imageUrl = dataResult.current.getGeneratedImageUrl(mockItem)
      
      expect(imageUrl).toBe('http://localhost:8000/uploads/fresh_salad.jpg')
    })

    it('should handle partial name matching', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockImagesGenerated = {
        'appetizers': [
          {
            english_name: 'Fresh Green Salad',
            image_url: '/uploads/green_salad.jpg',
            generation_success: true
          }
        ]
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'active', 'Generating images', {
          images_generated: mockImagesGenerated
        })
      })
      
      const mockItem = { english_name: 'Green Salad' }
      const imageUrl = dataResult.current.getGeneratedImageUrl(mockItem)
      
      expect(imageUrl).toBe('http://localhost:8000/uploads/green_salad.jpg')
    })

    it('should handle URL path construction correctly', () => {
      const { result: progressResult } = renderHook(() => useProgressStore())
      const { result: dataResult } = renderHook(() => useDataStore())
      
      const mockImagesGenerated = {
        'appetizers': [
          {
            english_name: 'Salad',
            image_url: 'salad.jpg', // Without /uploads/ prefix
            generation_success: true
          }
        ]
      }
      
      act(() => {
        progressResult.current.updateProgress(5, 'active', 'Generating images', {
          images_generated: mockImagesGenerated
        })
      })
      
      const mockItem = { english_name: 'Salad' }
      const imageUrl = dataResult.current.getGeneratedImageUrl(mockItem)
      
      expect(imageUrl).toBe('http://localhost:8000/uploads/salad.jpg')
    })
  })
}) 