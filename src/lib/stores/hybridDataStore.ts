// ハイブリッドデータストア - DBとSSE/Redisデータを統合管理
import { create } from 'zustand';
import { MenuTranslationDBApi } from '../api';
import config from '../config';
import { DBMenuItem, DBSessionDetail, DBProgressInfo } from '@/types';

// キャッシュエントリの型
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: 'db' | 'sse' | 'redis';
}

// データ品質レベル
type DataQualityLevel = 'realtime' | 'partial' | 'confirmed' | 'verified';

interface HybridDataStore {
  // === キャッシュ ===
  dbCache: Map<string, CacheEntry<any>>;
  sseCache: Map<string, CacheEntry<any>>;
  
  // === セッション情報 ===
  currentSessionId: string | null;
  dbSessionData: DBSessionDetail | null;
  
  // === データ品質マップ ===
  dataQuality: Map<string, DataQualityLevel>;
  
  // === メソッド ===
  // データ取得（ハイブリッド）
  getMenuItem: (sessionId: string, itemId: number) => Promise<any>;
  getSession: (sessionId: string) => Promise<DBSessionDetail | null>;
  
  // キャッシュ管理
  clearCache: () => void;
  isStale: (entry: CacheEntry<any>, ttl: number) => boolean;
  
  // バックグラウンド更新
  refreshDBInBackground: (sessionId: string, itemId?: number) => void;
  
  // SSE/Redis データ設定
  setSSEData: (key: string, data: any) => void;
  
  // セッション管理
  setCurrentSession: (sessionId: string) => void;
  
  // デバッグ用
  getDataSource: (key: string) => 'db' | 'sse' | 'redis' | 'none';
}

export const useHybridDataStore = create<HybridDataStore>((set, get) => ({
  // === 初期状態 ===
  dbCache: new Map(),
  sseCache: new Map(),
  currentSessionId: null,
  dbSessionData: null,
  dataQuality: new Map(),
  
  // === データ取得メソッド ===
  getMenuItem: async (sessionId: string, itemId: number) => {
    const state = get();
    const key = `${sessionId}:${itemId}`;
    
    // フィーチャーフラグチェック
    if (!config.features.useDatabase) {
      // DB機能がOFFの場合はSSEキャッシュのみ使用
      const sseData = state.sseCache.get(key);
      return sseData?.data || null;
    }
    
    // 1. DBキャッシュチェック
    const dbCached = state.dbCache.get(key);
    if (dbCached && !state.isStale(dbCached, config.cache.dbCacheTTL)) {
      if (config.debugging.logDBApi) {
        console.log(`[HybridStore] ✅ DB cache hit: ${key}`);
      }
      return { ...dbCached.data, _source: 'db_cache', _quality: 'confirmed' };
    }
    
    // 2. SSEキャッシュチェック（即座に返す）
    const sseCached = state.sseCache.get(key);
    if (sseCached && !state.isStale(sseCached, config.cache.sseCacheTTL)) {
      // バックグラウンドでDB更新
      state.refreshDBInBackground(sessionId, itemId);
      
      if (config.debugging.logDBApi) {
        console.log(`[HybridStore] 📡 SSE cache hit: ${key}`);
      }
      return { ...sseCached.data, _source: 'sse_cache', _quality: 'realtime' };
    }
    
    // 3. ハイブリッドモード: 並列取得
    if (config.features.hybridMode) {
      try {
        // DBから取得を試みる
        const dbItem = await MenuTranslationDBApi.getMenuItem(sessionId, itemId);
        
        if (dbItem) {
          // DBデータをキャッシュ
          set(state => ({
            dbCache: new Map(state.dbCache).set(key, {
              data: dbItem,
              timestamp: Date.now(),
              source: 'db'
            }),
            dataQuality: new Map(state.dataQuality).set(key, 'confirmed')
          }));
          
          return { ...dbItem, _source: 'db', _quality: 'confirmed' };
        }
      } catch (error) {
        console.warn(`[HybridStore] DB fetch failed for ${key}:`, error);
      }
    }
    
    // 4. フォールバック: SSEデータを返す
    if (sseCached) {
      return { ...sseCached.data, _source: 'sse_stale', _quality: 'realtime' };
    }
    
    return null;
  },
  
  getSession: async (sessionId: string) => {
    const state = get();
    
    // キャッシュチェック
    if (state.currentSessionId === sessionId && state.dbSessionData) {
      const cacheAge = Date.now() - (state.dbCache.get(`session:${sessionId}`)?.timestamp || 0);
      if (cacheAge < config.cache.dbCacheTTL) {
        return state.dbSessionData;
      }
    }
    
    try {
      const session = await MenuTranslationDBApi.getSession(sessionId);
      
      if (session) {
        set({
          currentSessionId: sessionId,
          dbSessionData: session,
          dbCache: new Map(state.dbCache).set(`session:${sessionId}`, {
            data: session,
            timestamp: Date.now(),
            source: 'db'
          })
        });
      }
      
      return session;
    } catch (error) {
      console.error('[HybridStore] Failed to get session:', error);
      return null;
    }
  },
  
  // === キャッシュ管理 ===
  clearCache: () => {
    set({
      dbCache: new Map(),
      sseCache: new Map(),
      dataQuality: new Map(),
      dbSessionData: null
    });
  },
  
  isStale: (entry: CacheEntry<any>, ttl: number) => {
    return Date.now() - entry.timestamp > ttl;
  },
  
  // === バックグラウンド更新 ===
  refreshDBInBackground: (sessionId: string, itemId?: number) => {
    if (!config.features.useDatabase) return;
    
    // 非ブロッキングでDB更新
    setTimeout(async () => {
      try {
        if (itemId !== undefined) {
          const dbItem = await MenuTranslationDBApi.getMenuItem(sessionId, itemId);
          if (dbItem) {
            const key = `${sessionId}:${itemId}`;
            set(state => ({
              dbCache: new Map(state.dbCache).set(key, {
                data: dbItem,
                timestamp: Date.now(),
                source: 'db'
              }),
              dataQuality: new Map(state.dataQuality).set(key, 'confirmed')
            }));
            
            if (config.debugging.logDBApi) {
              console.log(`[HybridStore] 🔄 Background DB refresh completed: ${key}`);
            }
          }
        } else {
          // セッション全体を更新
          await get().getSession(sessionId);
        }
      } catch (error) {
        console.warn('[HybridStore] Background refresh failed:', error);
      }
    }, 0);
  },
  
  // === SSE/Redis データ設定 ===
  setSSEData: (key: string, data: any) => {
    set(state => ({
      sseCache: new Map(state.sseCache).set(key, {
        data,
        timestamp: Date.now(),
        source: 'sse'
      })
    }));
  },
  
  // === セッション管理 ===
  setCurrentSession: (sessionId: string) => {
    set({ currentSessionId: sessionId });
  },
  
  // === デバッグ用 ===
  getDataSource: (key: string) => {
    const state = get();
    
    if (state.dbCache.has(key)) return 'db';
    if (state.sseCache.has(key)) return 'sse';
    
    return 'none';
  }
}));

// デバッグ用ヘルパー
if (config.debugging.logDBApi && typeof window !== 'undefined') {
  (window as any).hybridStore = useHybridDataStore;
} 