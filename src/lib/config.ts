/**
 * Configuration and Feature Flags for Database Integration
 * 
 * This file manages the progressive rollout of database integration
 * while maintaining zero design impact on the UI components.
 */

// ===============================================
// 🏗️ Core Configuration
// ===============================================

export interface DatabaseConfig {
  features: {
    useDatabase: boolean;
    enableDatabaseFallback: boolean;
    hybridMode: boolean;
    databaseProgressiveRollout: number; // 0-100 percentage
    enableUserMigration: boolean;
    enablePerformanceMonitoring: boolean;
    preferDatabase: boolean;
  };
  api: {
    enableDatabaseAPI: boolean;
    databaseEndpointBase: string;
    redisEndpointBase: string;
    healthCheckTimeout: number;
    fallbackTimeout: number;
    baseUrl: string;
    version: string;
    timeout: number;
  };
  performance: {
    maxDatabaseLatency: number; // ms
    fallbackThreshold: number; // error count
    healthCheckInterval: number; // ms
  };
  debugging: {
    enableVerboseLogging: boolean;
    trackDataSourceMetrics: boolean;
    enableA11yTesting: boolean;
    logDBApi: boolean;
    showDataSource: boolean;
  };
  cache: {
    dbCacheTTL: number;
    sseCacheTTL: number;
  };
}

// ===============================================
// 🔧 Configuration Values
// ===============================================

export const config: DatabaseConfig = {
  features: {
    useDatabase: process.env.NEXT_PUBLIC_USE_DATABASE !== 'false',
    enableDatabaseFallback: process.env.NEXT_PUBLIC_ENABLE_DB_FALLBACK !== 'false',
    hybridMode: process.env.NEXT_PUBLIC_HYBRID_MODE !== 'false',
    databaseProgressiveRollout: parseFloat(process.env.NEXT_PUBLIC_DB_ROLLOUT_PERCENTAGE || '100'),
    enableUserMigration: process.env.NEXT_PUBLIC_ENABLE_USER_MIGRATION !== 'false',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING !== 'false',
    preferDatabase: process.env.NEXT_PUBLIC_PREFER_DATABASE !== 'false',
  },
  api: {
    enableDatabaseAPI: process.env.NEXT_PUBLIC_DB_API_ENABLED !== 'false',
    databaseEndpointBase: '/menu-translation',
    redisEndpointBase: '/menu-parallel',
    healthCheckTimeout: parseInt(process.env.NEXT_PUBLIC_HEALTH_CHECK_TIMEOUT || '3000'),
    fallbackTimeout: parseInt(process.env.NEXT_PUBLIC_FALLBACK_TIMEOUT || '5000'),
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
    timeout: 300000, // 5分
  },
  performance: {
    maxDatabaseLatency: parseInt(process.env.NEXT_PUBLIC_MAX_DB_LATENCY || '2000'),
    fallbackThreshold: parseInt(process.env.NEXT_PUBLIC_FALLBACK_THRESHOLD || '3'),
    healthCheckInterval: parseInt(process.env.NEXT_PUBLIC_HEALTH_CHECK_INTERVAL || '30000'),
  },
  debugging: {
    enableVerboseLogging: process.env.NEXT_PUBLIC_VERBOSE_LOGGING === 'true',
    trackDataSourceMetrics: process.env.NEXT_PUBLIC_TRACK_METRICS === 'true',
    enableA11yTesting: process.env.NEXT_PUBLIC_A11Y_TESTING === 'true',
    logDBApi: process.env.NEXT_PUBLIC_DEBUG_DB_API === 'true',
    showDataSource: process.env.NEXT_PUBLIC_SHOW_DATA_SOURCE === 'true',
  },
  cache: {
    dbCacheTTL: 5 * 60 * 1000, // 5分
    sseCacheTTL: 30 * 1000, // 30秒
  },
};

// ===============================================
// 🎯 Smart Data Source Selection
// ===============================================

export type DataSource = 'redis' | 'database' | 'hybrid';

/**
 * Determines if the current user should use the database
 * Based on feature flags and progressive rollout percentage
 */
export const shouldUseDatabase = (): boolean => {
  if (!config.features.useDatabase) {
    logDebug('Database disabled by feature flag');
    return false;
  }

  if (!config.api.enableDatabaseAPI) {
    logDebug('Database API disabled');
    return false;
  }

  // Progressive rollout: percentage-based activation
  if (config.features.databaseProgressiveRollout > 0) {
    const userHash = getUserHash();
    const shouldActivate = userHash < config.features.databaseProgressiveRollout;
    
    logDebug(`Progressive rollout: ${config.features.databaseProgressiveRollout}%, user hash: ${userHash}, activated: ${shouldActivate}`);
    return shouldActivate;
  }

  logDebug('Database enabled for all users');
  return true;
};

/**
 * Gets the optimal data source for the current user
 */
export const getOptimalDataSource = (): DataSource => {
  if (config.features.hybridMode) {
    return 'hybrid';
  }
  
  return shouldUseDatabase() ? 'database' : 'redis';
};

/**
 * Checks if fallback to Redis is enabled
 */
export const isFallbackEnabled = (): boolean => {
  return config.features.enableDatabaseFallback;
};

// ===============================================
// 🔍 User Identification and Hashing
// ===============================================

/**
 * Generate a consistent hash for the current user
 * Used for progressive rollout determination
 */
const getUserHash = (): number => {
  const userId = getUserId();
  let hash = 0;
  
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return percentage (0-100)
  return Math.abs(hash) % 100;
};

/**
 * Get a unique identifier for the current user
 * Falls back to session-based ID if no persistent user ID exists
 */
const getUserId = (): string => {
  // Try to get user ID from various sources
  let userId = localStorage.getItem('user_id');
  
  if (!userId) {
    userId = sessionStorage.getItem('session_user_id');
  }
  
  if (!userId) {
    // Generate a session-based ID
    userId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_user_id', userId);
  }
  
  return userId;
};

// ===============================================
// 💾 User Preferences Management
// ===============================================

/**
 * Get user's preferred data source
 */
export const getUserDataSourcePreference = (): DataSource | null => {
  try {
    const preference = localStorage.getItem('user_data_source_preference');
    return preference as DataSource | null;
  } catch {
    return null;
  }
};

/**
 * Set user's preferred data source
 */
export const setUserDataSourcePreference = (source: DataSource): void => {
  try {
    localStorage.setItem('user_data_source_preference', source);
    logDebug(`User preference set to: ${source}`);
  } catch (error) {
    logError('Failed to save user preference:', error);
  }
};

/**
 * Clear user's data source preference
 */
export const clearUserDataSourcePreference = (): void => {
  try {
    localStorage.removeItem('user_data_source_preference');
    logDebug('User preference cleared');
  } catch (error) {
    logError('Failed to clear user preference:', error);
  }
};

// ===============================================
// 📊 Performance Monitoring
// ===============================================

interface PerformanceMetrics {
  dataSource: DataSource;
  operation: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: string;
}

const performanceMetrics: PerformanceMetrics[] = [];

/**
 * Start tracking a performance metric
 */
export const startPerformanceTracking = (dataSource: DataSource, operation: string): string => {
  if (!config.debugging.trackDataSourceMetrics) return '';
  
  const trackingId = `${dataSource}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  performanceMetrics.push({
    dataSource,
    operation,
    startTime: performance.now(),
    success: false,
  });
  
  return trackingId;
};

/**
 * End tracking a performance metric
 */
export const endPerformanceTracking = (trackingId: string, success: boolean, error?: string): void => {
  if (!config.debugging.trackDataSourceMetrics || !trackingId) return;
  
  const metric = performanceMetrics.find(m => 
    `${m.dataSource}_${m.operation}_${m.startTime}_` === trackingId.substring(0, trackingId.lastIndexOf('_'))
  );
  
  if (metric) {
    metric.endTime = performance.now();
    metric.success = success;
    metric.error = error;
    
    const duration = metric.endTime - metric.startTime;
    logDebug(`${metric.dataSource} ${metric.operation}: ${duration.toFixed(2)}ms (${success ? 'success' : 'failed'})`);
  }
};

/**
 * Get performance metrics summary
 */
export const getPerformanceMetrics = () => {
  if (!config.debugging.trackDataSourceMetrics) return null;
  
  const completed = performanceMetrics.filter(m => m.endTime);
  
  const summary = {
    totalOperations: completed.length,
    successRate: completed.length > 0 ? (completed.filter(m => m.success).length / completed.length) * 100 : 0,
    averageLatency: completed.length > 0 ? 
      completed.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / completed.length : 0,
    byDataSource: {} as Record<DataSource, { count: number; avgLatency: number; successRate: number }>
  };
  
  // Group by data source
  ['redis', 'database', 'hybrid'].forEach(source => {
    const sourceMetrics = completed.filter(m => m.dataSource === source);
    if (sourceMetrics.length > 0) {
      summary.byDataSource[source as DataSource] = {
        count: sourceMetrics.length,
        avgLatency: sourceMetrics.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / sourceMetrics.length,
        successRate: (sourceMetrics.filter(m => m.success).length / sourceMetrics.length) * 100
      };
    }
  });
  
  return summary;
};

// ===============================================
// 🐛 Debug Logging
// ===============================================

export const logDebug = (...args: any[]): void => {
  if (config.debugging.enableVerboseLogging) {
    console.log('[DB Integration]', ...args);
  }
};

export const logError = (...args: any[]): void => {
  console.error('[DB Integration Error]', ...args);
};

export const logWarning = (...args: any[]): void => {
  console.warn('[DB Integration Warning]', ...args);
};

// ===============================================
// 🚨 Emergency Controls
// ===============================================

/**
 * Emergency rollback to Redis for all operations
 */
export const emergencyRollbackToRedis = (): void => {
  logWarning('EMERGENCY ROLLBACK TO REDIS ACTIVATED');
  
  // Clear all user preferences
  clearUserDataSourcePreference();
  
  // Set emergency flag
  sessionStorage.setItem('emergency_redis_mode', 'true');
  
  // Log the rollback
  console.error('[EMERGENCY] Database integration disabled - using Redis fallback');
};

/**
 * Check if emergency Redis mode is active
 */
export const isEmergencyRedisMode = (): boolean => {
  return sessionStorage.getItem('emergency_redis_mode') === 'true';
};

/**
 * Clear emergency Redis mode
 */
export const clearEmergencyRedisMode = (): void => {
  sessionStorage.removeItem('emergency_redis_mode');
  logDebug('Emergency Redis mode cleared');
};

// ===============================================
// 🔧 Development Utilities
// ===============================================

if (typeof window !== 'undefined') {
  // Expose utilities for development/debugging
  (window as any).__dbIntegration = {
    config,
    shouldUseDatabase,
    getOptimalDataSource,
    getUserDataSourcePreference,
    setUserDataSourcePreference,
    getPerformanceMetrics,
    emergencyRollbackToRedis,
    clearEmergencyRedisMode,
  };
}

export default config;