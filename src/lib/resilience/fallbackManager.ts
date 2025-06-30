/**
 * Intelligent Fallback Manager for Database Integration
 * 
 * This module provides robust fallback mechanisms to ensure zero downtime
 * and seamless user experience when switching between data sources.
 */

import { 
  logDebug, 
  logError, 
  logWarning,
  config,
  emergencyRollbackToRedis,
  startPerformanceTracking,
  endPerformanceTracking
} from '../config';
import { MenuTranslationApi } from '../api';
import { useDataStore } from '../stores/dataStore';
import { useProgressStore } from '../stores/progressStore';
import { TranslationResponse, DBSessionDetail } from '@/types';

// ===============================================
// 🔄 Core Fallback Operations
// ===============================================

export class FallbackManager {
  private static errorCounts = {
    database: 0,
    redis: 0
  };

  private static lastHealthCheck = {
    database: 0,
    redis: 0
  };

  /**
   * Execute operation with intelligent fallback
   */
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string,
    options: {
      fallbackEnabled?: boolean;
      maxRetries?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    const {
      fallbackEnabled = true,
      maxRetries = 2,
      timeoutMs = config.api.fallbackTimeout
    } = options;

    const trackingId = startPerformanceTracking('hybrid', operationName);

    try {
      // Try primary operation with timeout
      const result = await this.withTimeout(primaryOperation(), timeoutMs);
      
      endPerformanceTracking(trackingId, true);
      logDebug(`✅ ${operationName} succeeded with primary source`);
      
      // Reset error count on success
      this.errorCounts.database = 0;
      
      return result;
    } catch (primaryError) {
      this.errorCounts.database++;
      
      logWarning(`⚠️ ${operationName} failed with primary source (attempt ${this.errorCounts.database}):`, primaryError);

      // Check if we should trigger emergency rollback
      if (this.errorCounts.database >= config.performance.fallbackThreshold) {
        logError(`🚨 Error threshold reached for database operations. Consider emergency rollback.`);
        
        // Auto-rollback if too many consecutive errors
        if (this.errorCounts.database >= config.performance.fallbackThreshold * 2) {
          logError(`🔥 Auto-triggering emergency rollback due to excessive database errors`);
          emergencyRollbackToRedis();
        }
      }

      if (!fallbackEnabled) {
        endPerformanceTracking(trackingId, false, primaryError instanceof Error ? primaryError.message : 'Unknown error');
        throw primaryError;
      }

      try {
        logDebug(`🔄 ${operationName} attempting fallback...`);
        
        const result = await this.withTimeout(fallbackOperation(), timeoutMs);
        
        endPerformanceTracking(trackingId, true);
        logDebug(`✅ ${operationName} succeeded with fallback source`);
        
        return result;
      } catch (fallbackError) {
        this.errorCounts.redis++;
        
        endPerformanceTracking(trackingId, false, fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
        logError(`❌ ${operationName} failed with both sources:`, { 
          primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
        
        throw fallbackError;
      }
    }
  }

  /**
   * Add timeout wrapper to any promise
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }

  // ===============================================
  // 📊 Data Source Health Management
  // ===============================================

  /**
   * Check health of all data sources
   */
  static async checkDataSourceHealth(): Promise<{
    database: { available: boolean; latency: number; error?: string };
    redis: { available: boolean; latency: number; error?: string };
    recommendation: 'database' | 'redis' | 'hybrid';
  }> {
    logDebug('Checking data source health...');

    const results = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth()
    ]);

    const database = results[0].status === 'fulfilled' ? results[0].value : 
      { available: false, latency: -1, error: results[0].reason?.message || 'Unknown error' };
    
    const redis = results[1].status === 'fulfilled' ? results[1].value : 
      { available: false, latency: -1, error: results[1].reason?.message || 'Unknown error' };

    // Determine recommendation
    let recommendation: 'database' | 'redis' | 'hybrid' = 'redis';
    
    if (database.available && redis.available) {
      // Both available - choose based on performance
      if (database.latency < config.performance.maxDatabaseLatency && 
          database.latency <= redis.latency * 1.5) { // Allow 50% overhead for database
        recommendation = 'database';
      } else {
        recommendation = 'hybrid'; // Database available but slower
      }
    } else if (database.available) {
      recommendation = 'database';
    } else if (redis.available) {
      recommendation = 'redis';
    } else {
      recommendation = 'redis'; // Default fallback
    }

    logDebug('Health check results:', { database, redis, recommendation });

    return { database, redis, recommendation };
  }

  /**
   * Check database health
   */
  private static async checkDatabaseHealth(): Promise<{ available: boolean; latency: number; error?: string }> {
    const now = Date.now();
    
    // Skip if recently checked
    if (now - this.lastHealthCheck.database < config.performance.healthCheckInterval) {
      return { available: true, latency: 0 }; // Assume healthy if recently checked
    }

    try {
      const result = await MenuTranslationApi.testDatabasePerformance();
      this.lastHealthCheck.database = now;
      
      return {
        available: result.available,
        latency: result.responseTime,
        error: result.error
      };
    } catch (error) {
      return {
        available: false,
        latency: -1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Redis health (via existing health endpoint)
   */
  private static async checkRedisHealth(): Promise<{ available: boolean; latency: number; error?: string }> {
    const now = Date.now();
    
    // Skip if recently checked
    if (now - this.lastHealthCheck.redis < config.performance.healthCheckInterval) {
      return { available: true, latency: 0 }; // Assume healthy if recently checked
    }

    try {
      const result = await MenuTranslationApi.healthCheck();
      this.lastHealthCheck.redis = now;
      
      return {
        available: true,
        latency: 100, // Assume fast for Redis
        error: undefined
      };
    } catch (error) {
      return {
        available: false,
        latency: -1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===============================================
  // 🔄 Smart Data Operations
  // ===============================================

  /**
   * Smart menu data retrieval with automatic fallback
   */
  static async smartMenuDataRetrieval(sessionId: string): Promise<Record<string, unknown[]> | null> {
    return this.withFallback(
      async () => {
        logDebug('Attempting database menu data retrieval');
        const session = await MenuTranslationApi.getDatabaseSession(sessionId);
        return useDataStore.getState().transformDatabaseToMenuData ? 
          useDataStore.getState().transformDatabaseToMenuData(session) : null;
      },
      async () => {
        logDebug('Falling back to Redis menu data retrieval');
        return useDataStore.getState().getCurrentMenuData();
      },
      'Menu Data Retrieval',
      { fallbackEnabled: config.features.enableDatabaseFallback }
    );
  }

  /**
   * Smart progress tracking with fallback
   */
  static async smartProgressTracking(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ): Promise<() => void> {
    try {
      logDebug('Attempting database progress tracking');
      
      const cleanup = await MenuTranslationApi.streamDatabaseProgress(sessionId, (event) => {
        const progressStore = useProgressStore.getState();
        progressStore.updateProgressFromDatabase(event);
      });
      
      logDebug('Database progress tracking established');
      return cleanup;
    } catch (error) {
      logWarning('Database progress tracking failed, using Redis fallback:', error);
      
      // Fallback: no explicit Redis progress tracking needed as it's handled by existing translateMenuWithProgress
      return () => {
        logDebug('Redis progress tracking cleanup (no-op)');
      };
    }
  }

  /**
   * Smart session creation with fallback
   */
  static async smartSessionCreation(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ): Promise<TranslationResponse> {
    const healthCheck = await this.checkDataSourceHealth();
    
    if (healthCheck.recommendation === 'database' && healthCheck.database.available) {
      return this.withFallback(
        async () => {
          logDebug('Creating session with database-first approach');
          return await MenuTranslationApi.translateMenuWithEnhancedProgress(file, onProgress);
        },
        async () => {
          logDebug('Falling back to Redis session creation');
          return await MenuTranslationApi.translateMenuWithProgress(file, onProgress);
        },
        'Session Creation'
      );
    } else {
      logDebug('Using Redis for session creation based on health check');
      return await MenuTranslationApi.translateMenuWithProgress(file, onProgress);
    }
  }

  // ===============================================
  // 🔧 Recovery Operations
  // ===============================================

  /**
   * Attempt to recover from database failures
   */
  static async attemptDatabaseRecovery(): Promise<boolean> {
    logDebug('Attempting database recovery...');
    
    try {
      const health = await this.checkDatabaseHealth();
      
      if (health.available && health.latency < config.performance.maxDatabaseLatency) {
        // Reset error counts
        this.errorCounts.database = 0;
        
        logDebug('Database recovery successful');
        return true;
      } else {
        logWarning('Database still unhealthy after recovery attempt:', health);
        return false;
      }
    } catch (error) {
      logError('Database recovery failed:', error);
      return false;
    }
  }

  /**
   * Sync data between sources for consistency
   */
  static async syncDataSources(sessionId: string): Promise<boolean> {
    try {
      logDebug('Syncing data between Redis and Database');
      
      const dataStore = useDataStore.getState();
      const progressStore = useProgressStore.getState();
      
      // Try to sync both data and progress
      await Promise.all([
        dataStore.syncWithDatabase(sessionId),
        progressStore.syncProgressWithDatabase(sessionId)
      ]);
      
      // Validate consistency
      const [dataConsistent, progressConsistent] = await Promise.all([
        dataStore.validateDataConsistency(),
        progressStore.validateProgressConsistency()
      ]);
      
      if (dataConsistent && progressConsistent) {
        logDebug('Data source sync completed successfully');
        return true;
      } else {
        logWarning('Data source sync completed but consistency validation failed');
        return false;
      }
    } catch (error) {
      logError('Data source sync failed:', error);
      return false;
    }
  }

  // ===============================================
  // 📊 Monitoring and Metrics
  // ===============================================

  /**
   * Get fallback system metrics
   */
  static getMetrics() {
    return {
      errorCounts: { ...this.errorCounts },
      lastHealthCheck: { ...this.lastHealthCheck },
      config: {
        fallbackThreshold: config.performance.fallbackThreshold,
        maxDatabaseLatency: config.performance.maxDatabaseLatency,
        healthCheckInterval: config.performance.healthCheckInterval
      }
    };
  }

  /**
   * Reset error counts (useful for recovery scenarios)
   */
  static resetErrorCounts() {
    this.errorCounts.database = 0;
    this.errorCounts.redis = 0;
    logDebug('Error counts reset');
  }

  /**
   * Force health check refresh
   */
  static forceHealthCheckRefresh() {
    this.lastHealthCheck.database = 0;
    this.lastHealthCheck.redis = 0;
    logDebug('Health check timestamps reset - next check will be fresh');
  }
}

// ===============================================
// 🧪 Testing and Development Utilities
// ===============================================

/**
 * Development utilities for testing fallback scenarios
 */
export class FallbackTestUtils {
  /**
   * Simulate database failure for testing
   */
  static simulateDatabaseFailure(durationMs: number = 30000) {
    logWarning(`🧪 Simulating database failure for ${durationMs}ms`);
    
    // Override database health check to return failure
    const originalCheckHealth = FallbackManager.checkDataSourceHealth;
    
    FallbackManager.checkDataSourceHealth = async () => {
      const redis = await FallbackManager['checkRedisHealth']();
      return {
        database: { available: false, latency: -1, error: 'Simulated failure' },
        redis,
        recommendation: 'redis' as const
      };
    };
    
    // Restore after duration
    setTimeout(() => {
      FallbackManager.checkDataSourceHealth = originalCheckHealth;
      logDebug('🧪 Database failure simulation ended');
    }, durationMs);
  }

  /**
   * Test fallback operations
   */
  static async testFallbackScenarios() {
    logDebug('🧪 Testing fallback scenarios...');
    
    const scenarios = [
      {
        name: 'Database timeout',
        test: () => FallbackManager.withFallback(
          () => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          ),
          () => Promise.resolve('Fallback success'),
          'Timeout Test'
        )
      },
      {
        name: 'Database error',
        test: () => FallbackManager.withFallback(
          () => Promise.reject(new Error('Database error')),
          () => Promise.resolve('Fallback success'),
          'Error Test'
        )
      }
    ];
    
    const results = [];
    
    for (const scenario of scenarios) {
      try {
        const result = await scenario.test();
        results.push({ name: scenario.name, success: true, result });
        logDebug(`✅ ${scenario.name}: ${result}`);
      } catch (error) {
        results.push({ name: scenario.name, success: false, error });
        logError(`❌ ${scenario.name}:`, error);
      }
    }
    
    return results;
  }
}

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).__fallbackManager = {
    FallbackManager,
    FallbackTestUtils
  };
}

export default FallbackManager;