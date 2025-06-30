/**
 * User Migration Manager for Database Integration
 * 
 * This module handles the gradual migration of users from Redis to Database
 * while ensuring zero downtime and seamless user experience.
 */

import { 
  logDebug, 
  logError, 
  logWarning,
  config,
  getUserDataSourcePreference,
  setUserDataSourcePreference,
  clearUserDataSourcePreference,
  startPerformanceTracking,
  endPerformanceTracking
} from '../config';
import { MenuTranslationApi } from '../api';
import { useDataStore } from '../stores/dataStore';
import { useProgressStore } from '../stores/progressStore';
import FallbackManager from '../resilience/fallbackManager';

// ===============================================
// 📊 Migration Status Types
// ===============================================

export interface UserMigrationStatus {
  userId: string;
  currentDataSource: 'redis' | 'database' | 'hybrid';
  migrationStage: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  lastMigrationAttempt?: number;
  migrationAttempts: number;
  activeSessions: string[];
  dataConsistency: boolean;
  performanceMetrics?: {
    redisLatency: number;
    databaseLatency: number;
    successRate: number;
  };
}

export interface MigrationPlan {
  targetUsers: number;
  rolloutPercentage: number;
  strategy: 'gradual' | 'immediate' | 'a_b_test';
  fallbackEnabled: boolean;
  validationRequired: boolean;
}

// ===============================================
// 👤 User Migration Manager
// ===============================================

export class UserMigrationManager {
  private static migrationHistory = new Map<string, UserMigrationStatus>();
  private static activeMigrations = new Set<string>();

  // ===============================================
  // 🚀 Core Migration Operations
  // ===============================================

  /**
   * Migrate a user to database with comprehensive validation
   */
  static async migrateUserToDatabase(userId: string, options: {
    validateConsistency?: boolean;
    migrateActiveSessions?: boolean;
    rollbackOnFailure?: boolean;
    dryRun?: boolean;
  } = {}): Promise<{
    success: boolean;
    status: UserMigrationStatus;
    migratedSessions: string[];
    errors: string[];
  }> {
    const {
      validateConsistency = true,
      migrateActiveSessions = true,
      rollbackOnFailure = true,
      dryRun = false
    } = options;

    logDebug(`Starting user migration to database for user: ${userId}`, { options });

    // Prevent concurrent migrations for the same user
    if (this.activeMigrations.has(userId)) {
      throw new Error(`Migration already in progress for user: ${userId}`);
    }

    this.activeMigrations.add(userId);
    const trackingId = startPerformanceTracking('database', 'userMigration');

    try {
      // Initialize migration status
      const migrationStatus: UserMigrationStatus = {
        userId,
        currentDataSource: 'redis',
        migrationStage: 'in_progress',
        lastMigrationAttempt: Date.now(),
        migrationAttempts: (this.migrationHistory.get(userId)?.migrationAttempts || 0) + 1,
        activeSessions: [],
        dataConsistency: false
      };

      const migratedSessions: string[] = [];
      const errors: string[] = [];

      // Step 1: Pre-migration health check
      logDebug('Step 1: Pre-migration health check');
      const healthCheck = await FallbackManager.checkDataSourceHealth();
      
      if (!healthCheck.database.available) {
        throw new Error(`Database is not available: ${healthCheck.database.error}`);
      }

      if (healthCheck.database.latency > config.performance.maxDatabaseLatency) {
        logWarning(`Database latency (${healthCheck.database.latency}ms) exceeds threshold (${config.performance.maxDatabaseLatency}ms)`);
        if (!rollbackOnFailure) {
          errors.push(`High database latency: ${healthCheck.database.latency}ms`);
        }
      }

      // Step 2: Identify active Redis sessions
      logDebug('Step 2: Identifying active Redis sessions');
      const activeSessions = await this.findActiveRedisSessions(userId);
      migrationStatus.activeSessions = activeSessions;

      logDebug(`Found ${activeSessions.length} active Redis sessions for user`);

      // Step 3: Migrate active sessions (if requested)
      if (migrateActiveSessions && activeSessions.length > 0 && !dryRun) {
        logDebug('Step 3: Migrating active sessions');
        
        for (const sessionId of activeSessions) {
          try {
            const migrationResult = await this.migrateSessionToDatabase(sessionId);
            
            if (migrationResult.success) {
              migratedSessions.push(sessionId);
              logDebug(`Successfully migrated session: ${sessionId}`);
            } else {
              errors.push(`Failed to migrate session ${sessionId}: ${migrationResult.error}`);
              logError(`Session migration failed: ${sessionId}`, migrationResult.error);
            }
          } catch (sessionError) {
            const errorMsg = `Session migration error ${sessionId}: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logError(errorMsg);
          }
        }
      }

      // Step 4: Data consistency validation
      if (validateConsistency && migratedSessions.length > 0 && !dryRun) {
        logDebug('Step 4: Validating data consistency');
        
        try {
          const consistencyResults = await Promise.all(
            migratedSessions.map(sessionId => this.validateSessionConsistency(sessionId))
          );
          
          const allConsistent = consistencyResults.every(result => result);
          migrationStatus.dataConsistency = allConsistent;
          
          if (!allConsistent) {
            errors.push('Data consistency validation failed for some sessions');
            logWarning('Data consistency validation failed for some migrated sessions');
          } else {
            logDebug('All migrated sessions passed consistency validation');
          }
        } catch (validationError) {
          errors.push(`Consistency validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
          logError('Consistency validation failed:', validationError);
        }
      }

      // Step 5: Update user preference (if not dry run)
      if (!dryRun) {
        logDebug('Step 5: Updating user preference');
        
        // Determine final data source based on results
        let finalDataSource: 'redis' | 'database' | 'hybrid' = 'database';
        
        if (errors.length > 0 && rollbackOnFailure) {
          finalDataSource = 'redis';
          migrationStatus.migrationStage = 'rolled_back';
          logWarning('Migration rolled back due to errors:', errors);
        } else if (errors.length > 0) {
          finalDataSource = 'hybrid'; // Partial success
          migrationStatus.migrationStage = 'completed';
          logWarning('Migration completed with warnings:', errors);
        } else {
          migrationStatus.migrationStage = 'completed';
          logDebug('Migration completed successfully');
        }

        migrationStatus.currentDataSource = finalDataSource;
        
        // Update user preference
        setUserDataSourcePreference(finalDataSource);
        
        // Update stores
        useDataStore.getState().setDataSource(finalDataSource);
        useProgressStore.getState().setProgressSource(finalDataSource);
      } else {
        logDebug('Dry run completed - no changes made');
        migrationStatus.migrationStage = 'completed';
        migrationStatus.currentDataSource = 'redis'; // No change in dry run
      }

      // Step 6: Store migration history
      this.migrationHistory.set(userId, migrationStatus);

      endPerformanceTracking(trackingId, migrationStatus.migrationStage === 'completed');

      const success = migrationStatus.migrationStage === 'completed';
      
      logDebug(`User migration ${success ? 'completed' : 'failed'} for user: ${userId}`, {
        migratedSessions: migratedSessions.length,
        errors: errors.length,
        finalDataSource: migrationStatus.currentDataSource
      });

      return {
        success,
        status: migrationStatus,
        migratedSessions,
        errors
      };

    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown migration error';
      logError(`User migration failed for ${userId}:`, error);

      // Update migration status
      const failedStatus: UserMigrationStatus = {
        userId,
        currentDataSource: 'redis',
        migrationStage: 'failed',
        lastMigrationAttempt: Date.now(),
        migrationAttempts: (this.migrationHistory.get(userId)?.migrationAttempts || 0) + 1,
        activeSessions: [],
        dataConsistency: false
      };

      this.migrationHistory.set(userId, failedStatus);

      return {
        success: false,
        status: failedStatus,
        migratedSessions: [],
        errors: [errorMsg]
      };
    } finally {
      this.activeMigrations.delete(userId);
    }
  }

  /**
   * Migrate a specific session from Redis to Database
   */
  private static async migrateSessionToDatabase(sessionId: string): Promise<{
    success: boolean;
    databaseSessionId?: string;
    error?: string;
  }> {
    try {
      logDebug(`Migrating session ${sessionId} from Redis to Database`);

      // Estimate item count (this might need adjustment based on your Redis structure)
      const estimatedItemCount = await this.estimateSessionItemCount(sessionId);
      
      if (estimatedItemCount === 0) {
        logWarning(`No items found for session ${sessionId}, skipping migration`);
        return { success: true };
      }

      // Call the migration endpoint
      const migrationResult = await MenuTranslationApi.migrateRedisToDatabase(sessionId, estimatedItemCount);

      if (migrationResult.success) {
        logDebug(`Session ${sessionId} migrated successfully to database`);
        return {
          success: true,
          databaseSessionId: migrationResult.session_id
        };
      } else {
        return {
          success: false,
          error: migrationResult.message || 'Migration failed without specific error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Estimate the number of items in a Redis session
   */
  private static async estimateSessionItemCount(sessionId: string): Promise<number> {
    // This is a simplified estimation - in a real implementation,
    // you might want to check Redis directly or use session metadata
    try {
      // Try to get existing session data
      const dataStore = useDataStore.getState();
      const currentData = dataStore.getCurrentMenuData();
      
      if (currentData) {
        const totalItems = Object.values(currentData).reduce((sum, items) => sum + items.length, 0);
        return totalItems;
      }
      
      // Default estimation if no data available
      return 10;
    } catch (error) {
      logWarning('Failed to estimate session item count:', error);
      return 5; // Conservative estimate
    }
  }

  // ===============================================
  // 🔍 Session Discovery and Management
  // ===============================================

  /**
   * Find active Redis sessions for a user
   */
  private static async findActiveRedisSessions(userId: string): Promise<string[]> {
    try {
      // Check current session in progress store
      const progressStore = useProgressStore.getState();
      const currentSessionId = progressStore.sessionId;
      
      if (currentSessionId) {
        logDebug(`Found active session in progress store: ${currentSessionId}`);
        return [currentSessionId];
      }

      // Check for sessions in local storage or session storage
      const storedSessions: string[] = [];
      
      try {
        const recentSessions = localStorage.getItem('recent_sessions');
        if (recentSessions) {
          const sessions = JSON.parse(recentSessions);
          if (Array.isArray(sessions)) {
            storedSessions.push(...sessions.slice(0, 5)); // Limit to recent 5 sessions
          }
        }
      } catch (storageError) {
        logWarning('Failed to read recent sessions from storage:', storageError);
      }

      logDebug(`Found ${storedSessions.length} stored sessions for user`);
      return storedSessions;

    } catch (error) {
      logError('Failed to find active Redis sessions:', error);
      return [];
    }
  }

  /**
   * Validate consistency between Redis and Database for a session
   */
  private static async validateSessionConsistency(sessionId: string): Promise<boolean> {
    try {
      logDebug(`Validating consistency for session: ${sessionId}`);

      const dataStore = useDataStore.getState();
      const progressStore = useProgressStore.getState();

      // Validate data consistency
      const dataConsistent = await dataStore.validateDataConsistency();
      
      // Validate progress consistency  
      const progressConsistent = await progressStore.validateProgressConsistency();

      const overallConsistent = dataConsistent && progressConsistent;
      
      logDebug(`Consistency validation for ${sessionId}:`, {
        data: dataConsistent,
        progress: progressConsistent,
        overall: overallConsistent
      });

      return overallConsistent;
    } catch (error) {
      logError(`Consistency validation failed for session ${sessionId}:`, error);
      return false;
    }
  }

  // ===============================================
  // 📊 Migration Analytics and Monitoring
  // ===============================================

  /**
   * Get migration status for a user
   */
  static getUserMigrationStatus(userId: string): UserMigrationStatus | null {
    return this.migrationHistory.get(userId) || null;
  }

  /**
   * Get current data source preference for a user
   */
  static getUserDataSource(userId: string): 'redis' | 'database' | 'hybrid' {
    const userPreference = getUserDataSourcePreference();
    
    if (userPreference) {
      return userPreference;
    }
    
    // Check migration history
    const migrationStatus = this.migrationHistory.get(userId);
    if (migrationStatus && migrationStatus.migrationStage === 'completed') {
      return migrationStatus.currentDataSource;
    }
    
    // Default to configuration-based decision
    return config.features.useDatabase ? 'database' : 'redis';
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    activeMigrations: number;
    averageSuccessRate: number;
    dataSourceDistribution: {
      redis: number;
      database: number;
      hybrid: number;
    };
  } {
    const allMigrations = Array.from(this.migrationHistory.values());
    
    const successful = allMigrations.filter(m => m.migrationStage === 'completed').length;
    const failed = allMigrations.filter(m => m.migrationStage === 'failed').length;
    
    const distribution = {
      redis: allMigrations.filter(m => m.currentDataSource === 'redis').length,
      database: allMigrations.filter(m => m.currentDataSource === 'database').length,
      hybrid: allMigrations.filter(m => m.currentDataSource === 'hybrid').length
    };

    return {
      totalMigrations: allMigrations.length,
      successfulMigrations: successful,
      failedMigrations: failed,
      activeMigrations: this.activeMigrations.size,
      averageSuccessRate: allMigrations.length > 0 ? (successful / allMigrations.length) * 100 : 0,
      dataSourceDistribution: distribution
    };
  }

  // ===============================================
  // 🔄 Rollback and Recovery
  // ===============================================

  /**
   * Rollback a user from database to Redis
   */
  static async rollbackUserToRedis(userId: string, reason?: string): Promise<boolean> {
    try {
      logWarning(`Rolling back user ${userId} to Redis${reason ? `: ${reason}` : ''}`);

      // Update user preference
      setUserDataSourcePreference('redis');
      
      // Update stores
      useDataStore.getState().setDataSource('redis');
      useProgressStore.getState().setProgressSource('redis');

      // Update migration history
      const currentStatus = this.migrationHistory.get(userId);
      if (currentStatus) {
        const rolledBackStatus: UserMigrationStatus = {
          ...currentStatus,
          currentDataSource: 'redis',
          migrationStage: 'rolled_back',
          lastMigrationAttempt: Date.now()
        };
        
        this.migrationHistory.set(userId, rolledBackStatus);
      }

      logDebug(`User ${userId} successfully rolled back to Redis`);
      return true;
    } catch (error) {
      logError(`Failed to rollback user ${userId} to Redis:`, error);
      return false;
    }
  }

  /**
   * Clear user migration data (useful for testing)
   */
  static clearUserMigrationData(userId: string): void {
    this.migrationHistory.delete(userId);
    this.activeMigrations.delete(userId);
    clearUserDataSourcePreference();
    
    logDebug(`Cleared migration data for user: ${userId}`);
  }

  /**
   * Clear all migration data
   */
  static clearAllMigrationData(): void {
    this.migrationHistory.clear();
    this.activeMigrations.clear();
    clearUserDataSourcePreference();
    
    logDebug('Cleared all migration data');
  }

  // ===============================================
  // 🧪 Testing and Development Utilities
  // ===============================================

  /**
   * Simulate user migration for testing
   */
  static async simulateMigration(userId: string, scenario: 'success' | 'failure' | 'partial'): Promise<UserMigrationStatus> {
    logDebug(`Simulating ${scenario} migration for user: ${userId}`);

    const simulatedStatus: UserMigrationStatus = {
      userId,
      currentDataSource: scenario === 'failure' ? 'redis' : scenario === 'partial' ? 'hybrid' : 'database',
      migrationStage: scenario === 'failure' ? 'failed' : 'completed',
      lastMigrationAttempt: Date.now(),
      migrationAttempts: 1,
      activeSessions: scenario === 'success' ? ['sim_session_1', 'sim_session_2'] : [],
      dataConsistency: scenario === 'success',
      performanceMetrics: {
        redisLatency: 50,
        databaseLatency: scenario === 'success' ? 120 : 5000,
        successRate: scenario === 'success' ? 100 : scenario === 'partial' ? 75 : 0
      }
    };

    this.migrationHistory.set(userId, simulatedStatus);
    return simulatedStatus;
  }

  /**
   * Test migration functionality
   */
  static async testMigrationFlow(userId: string): Promise<{
    healthCheck: boolean;
    sessionDiscovery: boolean;
    dataValidation: boolean;
    overallScore: number;
  }> {
    logDebug('Testing migration flow for user:', userId);

    const results = {
      healthCheck: false,
      sessionDiscovery: false,
      dataValidation: false,
      overallScore: 0
    };

    try {
      // Test health check
      const healthCheck = await FallbackManager.checkDataSourceHealth();
      results.healthCheck = healthCheck.database.available;

      // Test session discovery
      const sessions = await this.findActiveRedisSessions(userId);
      results.sessionDiscovery = true; // If no error thrown

      // Test data validation
      const dataStore = useDataStore.getState();
      results.dataValidation = await dataStore.validateDataConsistency();

      // Calculate overall score
      const scores = Object.values(results).filter(v => typeof v === 'boolean').map(v => v ? 1 : 0);
      results.overallScore = (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100;

      logDebug('Migration flow test results:', results);
      return results;

    } catch (error) {
      logError('Migration flow test failed:', error);
      return results;
    }
  }
}

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).__userMigration = UserMigrationManager;
}

export default UserMigrationManager;