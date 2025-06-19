import { useProgressStore } from '@/lib/stores/progressStore'

describe('Progress Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useProgressStore.getState()
    store.resetProgress()
    store.setSessionId(null)
  })

  describe('Initial State', () => {
    it('should have correct initial progress state', () => {
      const state = useProgressStore.getState()
      
      expect(state.currentStage).toBe(0)
      expect(state.sessionId).toBe(null)
      expect(state.progressStages).toHaveLength(6)
      expect(state.stageData).toEqual({
        realtimePartialResults: {},
        completedCategories: new Set<string>(),
        processingCategory: undefined,
        chunkProgress: undefined,
        categoryCompleted: undefined
      })
      
      // Check all stages are initially pending
      state.progressStages.forEach((stage, index) => {
        expect(stage.stage).toBe(index + 1)
        expect(stage.status).toBe('pending')
        expect(stage.message).toBeDefined()
        expect(stage.message.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Session Management', () => {
    it('should set session ID', () => {
      const { setSessionId } = useProgressStore.getState()
      
      setSessionId('test-session-123')
      
      expect(useProgressStore.getState().sessionId).toBe('test-session-123')
    })

    it('should clear session ID', () => {
      const { setSessionId } = useProgressStore.getState()
      
      setSessionId('test-session')
      setSessionId(null)
      
      expect(useProgressStore.getState().sessionId).toBe(null)
    })
  })

  describe('Progress Reset', () => {
    it('should reset progress to initial state', () => {
      const { updateProgress, resetProgress } = useProgressStore.getState()
      
      // First update some progress
      updateProgress(2, 'active', 'Processing...', { categories: { main: [] } })
      
      // Then reset
      resetProgress()
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(0)
      expect(state.stageData).toEqual({
        realtimePartialResults: {},
        completedCategories: new Set<string>(),
        processingCategory: undefined,
        chunkProgress: undefined,
        categoryCompleted: undefined
      })
      
      // All stages should be pending again
      state.progressStages.forEach(stage => {
        expect(stage.status).toBe('pending')
      })
    })
  })

  describe('Progress Updates', () => {
    it('should update stage 2 with categories data', () => {
      const { updateProgress } = useProgressStore.getState()
      const testCategories = {
        appetizers: [{ name: 'サラダ', id: '1' }],
        main: [{ name: '寿司', id: '2' }]
      }
      
      updateProgress(2, 'completed', 'Categories analyzed', { categories: testCategories })
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(2)
      expect(state.stageData.categories).toEqual(testCategories)
      
      // Check stage status update
      const stage2 = state.progressStages.find(s => s.stage === 2)
      expect(stage2?.status).toBe('completed')
      expect(stage2?.message).toBe('Categories analyzed')
    })

    it('should update stage 3 with translation data', () => {
      const { updateProgress } = useProgressStore.getState()
      const testTranslations = {
        appetizers: [{ name: 'Salad', japanese_name: 'サラダ', id: '1' }],
        main: [{ name: 'Sushi', japanese_name: '寿司', id: '2' }]
      }
      
      updateProgress(3, 'completed', 'Translation completed', { 
        translatedCategories: testTranslations 
      })
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(3)
      expect(state.stageData.translatedCategories).toEqual(testTranslations)
      expect(state.stageData.stage3_completed).toBe(true)
      expect(state.stageData.show_translated_menu).toBe(true)
    })

    it('should update stage 4 with final menu data', () => {
      const { updateProgress } = useProgressStore.getState()
      const testFinalMenu = {
        appetizers: [{ 
          name: 'Salad', 
          japanese_name: 'サラダ', 
          description: 'Fresh vegetables',
          id: '1' 
        }]
      }
      
      updateProgress(4, 'completed', 'Details added', { 
        final_menu: testFinalMenu 
      })
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(4)
      expect(state.stageData.finalMenu).toEqual(testFinalMenu)
    })

    it('should handle stage 4 realtime partial results', () => {
      const { updateProgress } = useProgressStore.getState()
      
      // Initialize realtime processing
      updateProgress(4, 'active', 'Processing category', { 
        processing_category: 'appetizers' 
      })
      
      let state = useProgressStore.getState()
      expect(state.stageData.processingCategory).toBe('appetizers')
      expect(state.stageData.realtimePartialResults).toEqual({})
      expect(state.stageData.completedCategories).toEqual(new Set<string>())
      
      // Add chunk result
      const chunkData = [{ name: 'Salad', id: '1' }]
      updateProgress(4, 'active', 'Chunk processed', { 
        chunk_result: chunkData 
      })
      
      state = useProgressStore.getState()
      expect(state.stageData.realtimePartialResults?.appetizers).toEqual(chunkData)
      
      // Complete category
      const completedItems = [
        { name: 'Salad', description: 'Fresh vegetables', id: '1' },
        { name: 'Soup', description: 'Hot soup', id: '2' }
      ]
      updateProgress(4, 'active', 'Category completed', { 
        category_completed: 'appetizers',
        completed_category_items: completedItems
      })
      
      state = useProgressStore.getState()
      expect(state.stageData.completedCategories?.has('appetizers')).toBe(true)
      expect(state.stageData.realtimePartialResults?.appetizers).toEqual(completedItems)
      expect(state.stageData.categoryCompleted?.name).toBe('appetizers')
    })

    it('should update stage 5 with image generation data', () => {
      const { updateProgress } = useProgressStore.getState()
      const testImages = {
        '1': [{
          english_name: 'Salad',
          image_url: 'https://example.com/salad.jpg',
          generation_success: true
        }]
      }
      
      updateProgress(5, 'completed', 'Images generated', { 
        images_generated: testImages 
      })
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(5)
      expect(state.stageData.imagesGenerated).toEqual(testImages)
    })

    it('should handle stage 5 image generation skipped', () => {
      const { updateProgress } = useProgressStore.getState()
      
      updateProgress(5, 'completed', 'Images skipped', { 
        skipped_reason: 'No items suitable for image generation'
      })
      
      const state = useProgressStore.getState()
      expect(state.stageData.imageGenerationSkipped).toBe('No items suitable for image generation')
    })

    it('should complete stage 6', () => {
      const { updateProgress } = useProgressStore.getState()
      
      updateProgress(6, 'completed', 'Process completed', { 
        final_result: 'All processing complete'
      })
      
      const state = useProgressStore.getState()
      expect(state.currentStage).toBe(6)
      
      const stage6 = state.progressStages.find(s => s.stage === 6)
      expect(stage6?.status).toBe('completed')
      expect(stage6?.message).toBe('Process completed')
    })
  })

  describe('Menu Item Status Utils', () => {
    it('should return basic status for stages < 4', () => {
      const { updateProgress, getMenuItemStatus } = useProgressStore.getState()
      
      updateProgress(2, 'active', 'Processing...')
      
      const item = { english_name: 'Salad', id: '1' }
      const status = getMenuItemStatus(item, 'appetizers')
      
      expect(status.isTranslated).toBe(false)
      expect(status.isComplete).toBe(false)
      expect(status.isPartiallyComplete).toBe(false)
      expect(status.isCurrentlyProcessing).toBe(false)
    })

    it('should return translated status for stage 3', () => {
      const { updateProgress, getMenuItemStatus } = useProgressStore.getState()
      
      updateProgress(3, 'active', 'Translating...')
      
      const item = { english_name: 'Salad', id: '1' }
      const status = getMenuItemStatus(item, 'appetizers')
      
      expect(status.isTranslated).toBe(true)
      expect(status.isComplete).toBe(false)
      expect(status.isPartiallyComplete).toBe(false)
      expect(status.isCurrentlyProcessing).toBe(false)
    })

    it('should detect items in final menu as complete', () => {
      const { updateProgress, getMenuItemStatus } = useProgressStore.getState()
      
      const finalMenu = {
        appetizers: [{ english_name: 'Salad', id: '1', description: 'Fresh' }]
      }
      updateProgress(4, 'active', 'Processing...', { final_menu: finalMenu })
      
      const item = { english_name: 'Salad', id: '1' }
      const status = getMenuItemStatus(item, 'appetizers')
      
      expect(status.isComplete).toBe(true)
      expect(status.isPartiallyComplete).toBe(false)
    })

    it('should detect items in realtime results as partially complete', () => {
      const { updateProgress, getMenuItemStatus } = useProgressStore.getState()
      
      // Set up realtime results without final menu
      updateProgress(4, 'active', 'Processing...', { 
        processing_category: 'appetizers'
      })
      updateProgress(4, 'active', 'Chunk added', { 
        chunk_result: [{ english_name: 'Salad', id: '1' }]
      })
      
      const item = { english_name: 'Salad', id: '1' }
      const status = getMenuItemStatus(item, 'appetizers')
      
      expect(status.isComplete).toBe(false)
      expect(status.isPartiallyComplete).toBe(true)
    })
  })

  describe('Category Progress Utils', () => {
    it('should return null for stages < 4', () => {
      const { updateProgress, getCategoryProgress } = useProgressStore.getState()
      
      updateProgress(2, 'active', 'Processing...')
      
      const progress = getCategoryProgress('appetizers')
      expect(progress).toBe(null)
    })

    it('should calculate category progress correctly', () => {
      const { updateProgress, getCategoryProgress } = useProgressStore.getState()
      
      // Set up stage 3 data
      const translatedData = {
        appetizers: [
          { english_name: 'Salad', id: '1' },
          { english_name: 'Soup', id: '2' }
        ]
      }
      updateProgress(3, 'completed', 'Translated', { translatedCategories: translatedData })
      
      // Move to stage 4 and add final results for one item
      updateProgress(4, 'active', 'Processing...', { 
        final_menu: {
          appetizers: [{ english_name: 'Salad', id: '1', description: 'Fresh' }]
        }
      })
      
      const progress = getCategoryProgress('appetizers')
      
      expect(progress?.total).toBe(2)
      expect(progress?.completed).toBe(1)
      expect(progress?.partial).toBe(0)
      expect(progress?.processing).toBe(false)
      expect(progress?.isCompleted).toBe(false)
    })

    it('should detect processing category', () => {
      const { updateProgress, getCategoryProgress } = useProgressStore.getState()
      
      const translatedData = {
        appetizers: [{ english_name: 'Salad', id: '1' }]
      }
      updateProgress(3, 'completed', 'Translated', { translatedCategories: translatedData })
      updateProgress(4, 'active', 'Processing...', { 
        processing_category: 'appetizers'
      })
      
      const progress = getCategoryProgress('appetizers')
      
      expect(progress?.processing).toBe(true)
      expect(progress?.isCompleted).toBe(false)
    })
  })

  describe('Overall Progress Utils', () => {
    it('should return null for stages < 4', () => {
      const { updateProgress, getOverallProgress } = useProgressStore.getState()
      
      updateProgress(2, 'active', 'Processing...')
      
      const progress = getOverallProgress()
      expect(progress).toBe(null)
    })

    it('should calculate overall progress correctly', () => {
      const { updateProgress, getOverallProgress } = useProgressStore.getState()
      
      // Set up translated data with multiple categories
      const translatedData = {
        appetizers: [
          { english_name: 'Salad', id: '1' },
          { english_name: 'Soup', id: '2' }
        ],
        main: [
          { english_name: 'Sushi', id: '3' },
          { english_name: 'Ramen', id: '4' }
        ]
      }
      updateProgress(3, 'completed', 'Translated', { translatedCategories: translatedData })
      
      // Add some final results
      updateProgress(4, 'active', 'Processing...', { 
        final_menu: {
          appetizers: [{ english_name: 'Salad', id: '1', description: 'Fresh' }],
          main: [{ english_name: 'Sushi', id: '3', description: 'Raw fish' }]
        }
      })
      
      const progress = getOverallProgress()
      
      expect(progress?.totalItems).toBe(4)
      expect(progress?.completedItems).toBe(2)
      expect(progress?.partialItems).toBe(0)
      expect(progress?.progressPercent).toBe(50)
    })
  })
}) 