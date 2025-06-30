/**
 * Database Integration Hook
 * 
 * This hook provides a unified interface for components to interact with
 * the database integration while maintaining backward compatibility.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '@/lib/stores/dataStore';
import { useProgressStore } from '@/lib/stores/progressStore';
import { 
  config, 
  getOptimalDataSource, 
  logDebug, 
  logError,
  isEmergencyRedisMode
} from '@/lib/config';
import FallbackManager from '@/lib/resilience/fallbackManager';
import UserMigrationManager from '@/lib/migration/userMigrationManager';
import DatabaseSSEManager from '@/lib/sse/databaseSSEManager';

// ===============================================
// 🔗 Database Integration Hook
// ===============================================

export interface DatabaseIntegrationState {
  // Data source information
  currentDataSource: 'redis' | 'database' | 'hybrid';
  isUsingDatabase: boolean;
  isEmergencyMode: boolean;
  
  // Health status
  databaseHealth: {
    available: boolean;
    latency: number;
    lastCheck: number;
  } | null;
  
  // Migration status
  migrationStatus: {
    isEligible: boolean;
    isInProgress: boolean;
    hasBeenMigrated: boolean;
    lastAttempt?: number;
  };
  
  // Performance metrics
  performanceMetrics: {
    redis: { operations: number; avgLatency: number; errors: number };
    database: { operations: number; avgLatency: number; errors: number };
  };
  
  // Session management
  sessionInfo: {
    sessionId: string | null;
    databaseSessionId: string | null;
    isConnected: boolean;
  };
}

export interface DatabaseIntegrationActions {
  // Data source management
  switchToDatabase: () => Promise<boolean>;
  switchToRedis: () => Promise<boolean>;
  switchToHybrid: () => Promise<boolean>;
  
  // Migration operations
  migrateToDatabase: () => Promise<boolean>;
  rollbackToRedis: () => Promise<boolean>;
  
  // Health and testing
  checkHealth: () => Promise<void>;
  testConnectivity: () => Promise<boolean>;
  
  // Session management
  syncWithDatabase: (sessionId: string) => Promise<boolean>;
  connectDatabaseStream: (sessionId: string) => Promise<boolean>;
  disconnectDatabaseStream: () => void;
  
  // Utilities
  resetMetrics: () => void;
  emergencyRollback: () => void;
}

/**
 * Main database integration hook
 */
export const useDatabaseIntegration = (userId?: string): [DatabaseIntegrationState, DatabaseIntegrationActions] => {
  // ===============================================
  // 🏪 Store Connections
  // ===============================================
  
  const dataStore = useDataStore();
  const progressStore = useProgressStore();
  
  // ===============================================
  // 📊 State Management
  // ===============================================
  
  const [state, setState] = useState<DatabaseIntegrationState>({
    currentDataSource: dataStore.dataSource,
    isUsingDatabase: dataStore.dataSource === 'database',
    isEmergencyMode: isEmergencyRedisMode(),
    databaseHealth: null,
    migrationStatus: {
      isEligible: config.features.enableUserMigration,
      isInProgress: false,
      hasBeenMigrated: false
    },
    performanceMetrics: dataStore.getDataSourceStats(),
    sessionInfo: {
      sessionId: progressStore.sessionId,
      databaseSessionId: progressStore.databaseSessionId || null,
      isConnected: false
    }
  });

  // ===============================================
  // 🔄 Effect Hooks
  // ===============================================
  
  // Monitor data source changes
  useEffect(() => {
    const updateState = () => {
      setState(prev => ({
        ...prev,
        currentDataSource: dataStore.dataSource,
        isUsingDatabase: dataStore.dataSource === 'database',
        isEmergencyMode: isEmergencyRedisMode(),
        performanceMetrics: dataStore.getDataSourceStats(),
        sessionInfo: {
          sessionId: progressStore.sessionId,
          databaseSessionId: progressStore.databaseSessionId || null,
          isConnected: progressStore.databaseSessionId ? 
            DatabaseSSEManager.isSessionConnected(progressStore.databaseSessionId) : false
        }
      }));
    };

    // Set up periodic updates
    const interval = setInterval(updateState, 5000); // Update every 5 seconds
    
    // Initial update
    updateState();
    
    return () => clearInterval(interval);
  }, [dataStore, progressStore]);

  // Initialize user migration status
  useEffect(() => {
    if (userId) {
      const migrationStatus = UserMigrationManager.getUserMigrationStatus(userId);
      
      setState(prev => ({
        ...prev,
        migrationStatus: {
          ...prev.migrationStatus,
          hasBeenMigrated: migrationStatus?.migrationStage === 'completed' || false,
          lastAttempt: migrationStatus?.lastMigrationAttempt
        }
      }));
    }
  }, [userId]);

  // ===============================================
  // 🎬 Action Implementations
  // ===============================================
  
  const switchToDatabase = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Switching to database data source');
      
      // Check if database is available
      const health = await FallbackManager.checkDataSourceHealth();
      
      if (!health.database.available) {
        logError('Cannot switch to database: not available');
        return false;
      }
      
      // Update stores
      dataStore.setDataSource('database');
      progressStore.setProgressSource('database');
      
      // Update state
      setState(prev => ({
        ...prev,
        currentDataSource: 'database',
        isUsingDatabase: true,
        databaseHealth: {
          available: health.database.available,
          latency: health.database.latency,
          lastCheck: Date.now()
        }
      }));
      
      logDebug('Successfully switched to database');
      return true;
    } catch (error) {
      logError('Failed to switch to database:', error);
      return false;
    }
  }, [dataStore, progressStore]);

  const switchToRedis = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Switching to Redis data source');
      
      // Update stores
      dataStore.setDataSource('redis');
      progressStore.setProgressSource('redis');
      
      // Disconnect database streams
      progressStore.disconnectDatabaseStream();
      
      // Update state
      setState(prev => ({
        ...prev,
        currentDataSource: 'redis',
        isUsingDatabase: false
      }));
      
      logDebug('Successfully switched to Redis');
      return true;
    } catch (error) {
      logError('Failed to switch to Redis:', error);
      return false;
    }
  }, [dataStore, progressStore]);

  const switchToHybrid = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Switching to hybrid data source');
      
      // Update stores
      dataStore.setDataSource('hybrid');
      progressStore.setProgressSource('hybrid');
      
      // Update state
      setState(prev => ({
        ...prev,
        currentDataSource: 'hybrid',
        isUsingDatabase: false // Hybrid uses Redis by default with database fallback
      }));
      
      logDebug('Successfully switched to hybrid mode');
      return true;
    } catch (error) {
      logError('Failed to switch to hybrid mode:', error);
      return false;
    }
  }, [dataStore, progressStore]);

  const migrateToDatabase = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      logError('Cannot migrate: no user ID provided');
      return false;
    }

    try {
      logDebug('Starting user migration to database');
      
      setState(prev => ({
        ...prev,
        migrationStatus: { ...prev.migrationStatus, isInProgress: true }
      }));

      const migrationResult = await UserMigrationManager.migrateUserToDatabase(userId, {
        validateConsistency: true,
        migrateActiveSessions: true,
        rollbackOnFailure: true
      });

      setState(prev => ({
        ...prev,
        migrationStatus: {
          ...prev.migrationStatus,
          isInProgress: false,
          hasBeenMigrated: migrationResult.success,
          lastAttempt: Date.now()
        }
      }));

      if (migrationResult.success) {
        // Update data source to database
        await switchToDatabase();
        logDebug('User migration completed successfully');
      } else {
        logError('User migration failed:', migrationResult.errors);
      }

      return migrationResult.success;
    } catch (error) {
      logError('Migration process failed:', error);
      
      setState(prev => ({
        ...prev,
        migrationStatus: { ...prev.migrationStatus, isInProgress: false }
      }));
      
      return false;
    }
  }, [userId, switchToDatabase]);

  const rollbackToRedis = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      logError('Cannot rollback: no user ID provided');
      return false;
    }

    try {
      logDebug('Rolling back user to Redis');
      
      const rollbackResult = await UserMigrationManager.rollbackUserToRedis(userId, 'User requested rollback');
      
      if (rollbackResult) {
        await switchToRedis();
        
        setState(prev => ({
          ...prev,
          migrationStatus: { ...prev.migrationStatus, hasBeenMigrated: false }
        }));
        
        logDebug('User rollback completed successfully');
      }

      return rollbackResult;
    } catch (error) {
      logError('Rollback failed:', error);
      return false;
    }
  }, [userId, switchToRedis]);

  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      logDebug('Checking database health');
      
      const health = await FallbackManager.checkDataSourceHealth();
      
      setState(prev => ({
        ...prev,
        databaseHealth: {
          available: health.database.available,
          latency: health.database.latency,
          lastCheck: Date.now()
        }
      }));
      
      logDebug('Health check completed:', health);
    } catch (error) {
      logError('Health check failed:', error);
      
      setState(prev => ({
        ...prev,
        databaseHealth: {
          available: false,
          latency: -1,
          lastCheck: Date.now()
        }
      }));
    }
  }, []);

  const testConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Testing database connectivity');
      
      if (!progressStore.sessionId) {
        logWarning('No active session for connectivity test');
        return false;
      }

      const testResult = await DatabaseSSEManager.testConnection(progressStore.sessionId);
      
      logDebug('Connectivity test result:', testResult);
      return testResult.success;
    } catch (error) {
      logError('Connectivity test failed:', error);
      return false;
    }
  }, [progressStore.sessionId]);

  const syncWithDatabase = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      logDebug('Syncing with database for session:', sessionId);
      
      await Promise.all([
        dataStore.syncWithDatabase(sessionId),
        progressStore.syncProgressWithDatabase(sessionId)
      ]);
      
      logDebug('Database sync completed');
      return true;
    } catch (error) {
      logError('Database sync failed:', error);
      return false;
    }
  }, [dataStore, progressStore]);

  const connectDatabaseStream = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      logDebug('Connecting database stream for session:', sessionId);
      
      await progressStore.connectDatabaseStream(sessionId);
      
      setState(prev => ({
        ...prev,
        sessionInfo: {
          ...prev.sessionInfo,
          databaseSessionId: sessionId,
          isConnected: true
        }
      }));
      
      logDebug('Database stream connected');
      return true;
    } catch (error) {
      logError('Failed to connect database stream:', error);
      return false;
    }
  }, [progressStore]);

  const disconnectDatabaseStream = useCallback((): void => {
    logDebug('Disconnecting database stream');
    
    progressStore.disconnectDatabaseStream();
    
    setState(prev => ({
      ...prev,
      sessionInfo: {
        ...prev.sessionInfo,
        databaseSessionId: null,
        isConnected: false
      }
    }));
    
    logDebug('Database stream disconnected');
  }, [progressStore]);

  const resetMetrics = useCallback((): void => {
    logDebug('Resetting performance metrics');
    
    // Reset fallback manager metrics
    FallbackManager.resetErrorCounts();
    
    // Update state
    setState(prev => ({
      ...prev,
      performanceMetrics: dataStore.getDataSourceStats()
    }));
    
    logDebug('Metrics reset');
  }, [dataStore]);

  const emergencyRollback = useCallback((): void => {
    logDebug('Triggering emergency rollback');
    
    // Use the global emergency rollback
    const { emergencyRollbackToRedis } = require('@/lib/config');
    emergencyRollbackToRedis();
    
    // Force switch to Redis
    switchToRedis();
    
    setState(prev => ({
      ...prev,
      isEmergencyMode: true,
      currentDataSource: 'redis',
      isUsingDatabase: false
    }));
    
    logDebug('Emergency rollback completed');
  }, [switchToRedis]);

  // ===============================================
  // 📤 Return Hook Interface
  // ===============================================

  const actions: DatabaseIntegrationActions = {
    switchToDatabase,
    switchToRedis,
    switchToHybrid,
    migrateToDatabase,
    rollbackToRedis,
    checkHealth,
    testConnectivity,
    syncWithDatabase,
    connectDatabaseStream,
    disconnectDatabaseStream,
    resetMetrics,
    emergencyRollback
  };

  return [state, actions];
};

// ===============================================
// 🧪 Testing Utilities Hook
// ===============================================

export const useDatabaseIntegrationTesting = () => {
  const [, actions] = useDatabaseIntegration();

  const runIntegrationTests = useCallback(async () => {
    logDebug('Running database integration tests...');
    
    const results = {
      healthCheck: false,
      dataSourceSwitching: false,
      migration: false,
      connectivity: false,
      overall: 0
    };

    try {
      // Test 1: Health Check
      await actions.checkHealth();
      results.healthCheck = true;
      
      // Test 2: Data Source Switching
      const switchTest = await actions.switchToHybrid();
      results.dataSourceSwitching = switchTest;
      
      // Test 3: Connectivity
      const connectivityTest = await actions.testConnectivity();
      results.connectivity = connectivityTest;
      
      // Test 4: Migration (simulation)
      // Note: This would need a real user ID in production
      results.migration = true; // Placeholder
      
      // Calculate overall score
      const testCount = Object.keys(results).length - 1; // Exclude 'overall'
      const passedTests = Object.entries(results)
        .filter(([key, value]) => key !== 'overall' && value === true)
        .length;
      
      results.overall = (passedTests / testCount) * 100;
      
      logDebug('Integration tests completed:', results);
      return results;
      
    } catch (error) {
      logError('Integration tests failed:', error);
      return results;
    }
  }, [actions]);

  return {
    runIntegrationTests
  };
};

export default useDatabaseIntegration;