import { useUIStore } from '@/lib/stores/uiStore'

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useUIStore.getState()
    // Reset to initial state
    store.ui.selectedCategory = 'all'
    store.ui.showItemDetail = false
    store.ui.selectedItemId = null
    store.ui.favorites = new Set<string>()
    store.ui.showDebugMonitor = false
    store.ui.showRawMenu = false
    store.ui.currentView = 'categories'
  })

  describe('Initial State', () => {
    it('should have correct initial UI state', () => {
      const { ui } = useUIStore.getState()
      
      expect(ui.selectedCategory).toBe('all')
      expect(ui.showItemDetail).toBe(false)
      expect(ui.selectedItemId).toBe(null)
      expect(ui.favorites).toEqual(new Set())
      expect(ui.showDebugMonitor).toBe(false)
      expect(ui.showRawMenu).toBe(false)
      expect(ui.currentView).toBe('categories')
    })
  })

  describe('Category Selection', () => {
    it('should update selected category', () => {
      const { setSelectedCategory } = useUIStore.getState()
      
      setSelectedCategory('desserts')
      
      const { ui } = useUIStore.getState()
      expect(ui.selectedCategory).toBe('desserts')
    })
  })

  describe('Item Detail Management', () => {
    it('should show item detail', () => {
      const { showItemDetail } = useUIStore.getState()
      
      showItemDetail('item-123')
      
      const { ui } = useUIStore.getState()
      expect(ui.showItemDetail).toBe(true)
      expect(ui.selectedItemId).toBe('item-123')
    })

    it('should hide item detail', () => {
      const { showItemDetail, hideItemDetail } = useUIStore.getState()
      
      // First show detail
      showItemDetail('item-123')
      
      // Then hide
      hideItemDetail()
      
      const { ui } = useUIStore.getState()
      expect(ui.showItemDetail).toBe(false)
      expect(ui.selectedItemId).toBe(null)
    })
  })

  describe('Favorites Management', () => {
    it('should add item to favorites', () => {
      const { toggleFavorite } = useUIStore.getState()
      
      toggleFavorite('item-456')
      
      const { ui } = useUIStore.getState()
      expect(ui.favorites.has('item-456')).toBe(true)
    })

    it('should remove item from favorites', () => {
      const { toggleFavorite } = useUIStore.getState()
      
      // Add to favorites
      toggleFavorite('item-456')
      expect(useUIStore.getState().ui.favorites.has('item-456')).toBe(true)
      
      // Remove from favorites
      toggleFavorite('item-456')
      expect(useUIStore.getState().ui.favorites.has('item-456')).toBe(false)
    })

    it('should handle multiple favorites', () => {
      const { toggleFavorite } = useUIStore.getState()
      
      toggleFavorite('item-1')
      toggleFavorite('item-2')
      toggleFavorite('item-3')
      
      const { ui } = useUIStore.getState()
      expect(ui.favorites.has('item-1')).toBe(true)
      expect(ui.favorites.has('item-2')).toBe(true)
      expect(ui.favorites.has('item-3')).toBe(true)
      expect(ui.favorites.size).toBe(3)
    })
  })

  describe('Debug Monitor', () => {
    it('should toggle debug monitor', () => {
      const { toggleDebugMonitor } = useUIStore.getState()
      
      // Initially false
      expect(useUIStore.getState().ui.showDebugMonitor).toBe(false)
      
      // Toggle to true
      toggleDebugMonitor()
      expect(useUIStore.getState().ui.showDebugMonitor).toBe(true)
      
      // Toggle back to false
      toggleDebugMonitor()
      expect(useUIStore.getState().ui.showDebugMonitor).toBe(false)
    })
  })

  describe('Raw Menu Display', () => {
    it('should toggle raw menu display', () => {
      const { toggleRawMenu } = useUIStore.getState()
      
      // Initially false
      expect(useUIStore.getState().ui.showRawMenu).toBe(false)
      
      // Toggle to true
      toggleRawMenu()
      expect(useUIStore.getState().ui.showRawMenu).toBe(true)
      
      // Toggle back to false
      toggleRawMenu()
      expect(useUIStore.getState().ui.showRawMenu).toBe(false)
    })
  })

  describe('View Management', () => {
    it('should set current view', () => {
      const { setCurrentView } = useUIStore.getState()
      
      setCurrentView('items')
      expect(useUIStore.getState().ui.currentView).toBe('items')
      
      setCurrentView('generated')
      expect(useUIStore.getState().ui.currentView).toBe('generated')
      
      setCurrentView('categories')
      expect(useUIStore.getState().ui.currentView).toBe('categories')
    })
  })

  // Emoji機能はData Storeに移動済み
}) 