/**
 * Database SSE Manager for Real-time Progress Tracking
 * 
 * This module provides enhanced SSE functionality for database-driven
 * progress tracking while maintaining compatibility with existing UI components.
 */

import { 
  logDebug, 
  logError, 
  logWarning,
  config,
  startPerformanceTracking,
  endPerformanceTracking
} from '../config';
import { 
  transformDatabaseProgressToUIProgress 
} from '../utils/dataTransformation';
import { DBProgressEvent, DBProgressResponse } from '@/types';
import { API_BASE_URL } from '../api';

// ===============================================
// 🔗 Database SSE Connection Manager
// ===============================================

export class DatabaseSSEManager {
  private static activeConnections = new Map<string, {
    eventSource: EventSource;
    cleanup: () => void;
    startTime: number;
    lastEvent: number;
  }>();

  private static connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalEvents: 0,
    connectionErrors: 0,
    averageLatency: 0
  };

  /**
   * Connect to database SSE stream for a session
   */
  static async connectToDatabase(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    options: {
      enableRetry?: boolean;
      maxRetryAttempts?: number;
      retryDelayMs?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<() => void> {
    const {
      enableRetry = true,
      maxRetryAttempts = 3,
      retryDelayMs = 2000,
      timeoutMs = 300000 // 5 minutes
    } = options;

    logDebug('Connecting to database SSE for session:', sessionId);

    // Clean up existing connection if any
    this.disconnectSession(sessionId);

    const trackingId = startPerformanceTracking('database', 'sseConnection');
    const startTime = Date.now();

    let retryCount = 0;
    let isCleanedUp = false;

    const attemptConnection = (): Promise<() => void> => {
      return new Promise((resolve, reject) => {
        const sseUrl = `${API_BASE_URL}${config.api.databaseEndpointBase}/sessions/${encodeURIComponent(sessionId)}/stream`;
        
        logDebug(`SSE connection attempt ${retryCount + 1} to:`, sseUrl);

        let eventSource: EventSource | null = null;
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let timeoutTimer: NodeJS.Timeout | null = null;
        let lastEventTime = Date.now();

        const cleanup = (reason: string) => {
          if (isCleanedUp) return;
          isCleanedUp = true;

          logDebug(`Cleaning up database SSE connection for ${sessionId}: ${reason}`);

          // Clear timers
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }

          // Close event source
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Remove from active connections
          this.activeConnections.delete(sessionId);
          this.connectionStats.activeConnections = this.activeConnections.size;

          endPerformanceTracking(trackingId, reason === 'manual_cleanup');
        };

        try {
          eventSource = new EventSource(sseUrl);

          // Connection opened
          eventSource.onopen = () => {
            logDebug(`Database SSE connection established for session: ${sessionId}`);
            
            this.connectionStats.totalConnections++;
            this.connectionStats.activeConnections = this.activeConnections.size + 1;

            // Store connection info
            this.activeConnections.set(sessionId, {
              eventSource: eventSource!,
              cleanup,
              startTime,
              lastEvent: Date.now()
            });

            // Reset retry count on successful connection
            retryCount = 0;

            // Setup heartbeat monitoring
            heartbeatInterval = setInterval(() => {
              const timeSinceLastEvent = Date.now() - lastEventTime;
              
              if (timeSinceLastEvent > 60000) { // 1 minute without events
                logWarning(`No SSE events received for ${timeSinceLastEvent}ms, connection may be stale`);
              }
            }, 30000); // Check every 30 seconds

            // Setup connection timeout
            timeoutTimer = setTimeout(() => {
              logWarning(`SSE connection timeout after ${timeoutMs}ms`);
              cleanup('timeout');
            }, timeoutMs);

            resolve(cleanup);
          };

          // Message received
          eventSource.onmessage = (event) => {
            if (isCleanedUp) return;

            lastEventTime = Date.now();
            this.connectionStats.totalEvents++;

            // Update connection stats
            const connection = this.activeConnections.get(sessionId);
            if (connection) {
              connection.lastEvent = lastEventTime;
            }

            try {
              const eventData = JSON.parse(event.data) as DBProgressEvent;
              
              logDebug(`Database SSE event received for ${sessionId}:`, eventData.type);

              // Handle different event types
              this.handleDatabaseEvent(eventData, onProgress, sessionId);

            } catch (parseError) {
              logError('Failed to parse database SSE event:', parseError);
              // Don't fail the entire connection for parsing errors
            }
          };

          // Connection error
          eventSource.onerror = (error) => {
            if (isCleanedUp) return;

            this.connectionStats.connectionErrors++;
            logError(`Database SSE connection error for ${sessionId}:`, error);

            cleanup('connection_error');

            // Retry logic
            if (enableRetry && retryCount < maxRetryAttempts) {
              retryCount++;
              logDebug(`Retrying SSE connection in ${retryDelayMs}ms (attempt ${retryCount}/${maxRetryAttempts})`);

              setTimeout(() => {
                if (!isCleanedUp) {
                  attemptConnection()
                    .then(resolve)
                    .catch(reject);
                }
              }, retryDelayMs);
            } else {
              reject(new Error(`Failed to establish SSE connection after ${retryCount} attempts`));
            }
          };

        } catch (error) {
          cleanup('initialization_error');
          reject(error);
        }
      });
    };

    return attemptConnection();
  }

  /**
   * Handle different types of database events
   */
  private static handleDatabaseEvent(
    eventData: DBProgressEvent,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    sessionId: string
  ) {
    switch (eventData.type) {
      case 'progress_update':
        this.handleProgressUpdate(eventData, onProgress);
        break;

      case 'item_completed':
        this.handleItemCompleted(eventData, onProgress);
        break;

      case 'session_completed':
        this.handleSessionCompleted(eventData, onProgress, sessionId);
        break;

      case 'heartbeat':
        this.handleHeartbeat(eventData, sessionId);
        break;

      case 'error':
        this.handleError(eventData, onProgress);
        break;

      default:
        logDebug('Unhandled database SSE event type:', eventData.type);
        // Try to handle as generic progress update
        this.handleProgressUpdate(eventData, onProgress);
    }
  }

  /**
   * Handle progress update events
   */
  private static handleProgressUpdate(
    eventData: DBProgressEvent,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ) {
    try {
      const transformedProgress = transformDatabaseProgressToUIProgress(eventData);
      
      onProgress(
        transformedProgress.stage,
        transformedProgress.status,
        transformedProgress.message,
        transformedProgress.data
      );

      logDebug('Progress update processed:', {
        stage: transformedProgress.stage,
        status: transformedProgress.status,
        message: transformedProgress.message
      });
    } catch (error) {
      logError('Failed to process progress update:', error);
    }
  }

  /**
   * Handle item completion events
   */
  private static handleItemCompleted(
    eventData: DBProgressEvent,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ) {
    if (eventData.item) {
      const stage = this.determineStageFromItem(eventData.item);
      
      onProgress(stage, 'active', `Item completed: ${eventData.item.english_text || eventData.item.japanese_text}`, {
        completed_item: {
          japanese_name: eventData.item.japanese_text,
          english_name: eventData.item.english_text,
          description: eventData.item.description,
          category: eventData.item.category
        }
      });
    }
  }

  /**
   * Handle session completion events
   */
  private static handleSessionCompleted(
    eventData: DBProgressEvent,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    sessionId: string
  ) {
    onProgress(6, 'completed', 'Session processing completed', {
      session_completed: true,
      final_stats: eventData.data
    });

    // Auto-cleanup on completion
    setTimeout(() => {
      this.disconnectSession(sessionId);
    }, 5000); // 5 second delay to allow UI to process completion
  }

  /**
   * Handle heartbeat events
   */
  private static handleHeartbeat(eventData: DBProgressEvent, sessionId: string) {
    logDebug(`Heartbeat received for session ${sessionId}`);
    
    // Update last event time
    const connection = this.activeConnections.get(sessionId);
    if (connection) {
      connection.lastEvent = Date.now();
    }
  }

  /**
   * Handle error events
   */
  private static handleError(
    eventData: DBProgressEvent,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ) {
    logError('Database SSE error event:', eventData.data);
    
    onProgress(0, 'error', eventData.message || 'An error occurred during processing', {
      error: eventData.data,
      error_type: 'database_processing_error'
    });
  }

  /**
   * Determine processing stage from item status
   */
  private static determineStageFromItem(item: any): number {
    if (item.image_status === 'completed') return 5;
    if (item.description_status === 'completed') return 4;
    if (item.translation_status === 'completed') return 3;
    return 2;
  }

  // ===============================================
  // 🔧 Connection Management
  // ===============================================

  /**
   * Disconnect a specific session
   */
  static disconnectSession(sessionId: string): void {
    const connection = this.activeConnections.get(sessionId);
    
    if (connection) {
      logDebug(`Disconnecting SSE for session: ${sessionId}`);
      connection.cleanup('manual_disconnect');
    }
  }

  /**
   * Disconnect all active sessions
   */
  static disconnectAll(): void {
    logDebug(`Disconnecting all ${this.activeConnections.size} active SSE connections`);
    
    for (const [sessionId, connection] of this.activeConnections.entries()) {
      connection.cleanup('disconnect_all');
    }
    
    this.activeConnections.clear();
    this.connectionStats.activeConnections = 0;
  }

  /**
   * Check if a session has an active connection
   */
  static isSessionConnected(sessionId: string): boolean {
    return this.activeConnections.has(sessionId);
  }

  /**
   * Get connection info for a session
   */
  static getConnectionInfo(sessionId: string) {
    const connection = this.activeConnections.get(sessionId);
    
    if (connection) {
      return {
        connected: true,
        duration: Date.now() - connection.startTime,
        lastEvent: Date.now() - connection.lastEvent,
        url: connection.eventSource.url
      };
    }
    
    return { connected: false };
  }

  // ===============================================
  // 📊 Statistics and Monitoring
  // ===============================================

  /**
   * Get connection statistics
   */
  static getStats() {
    const totalUptime = Array.from(this.activeConnections.values())
      .reduce((sum, conn) => sum + (Date.now() - conn.startTime), 0);

    return {
      ...this.connectionStats,
      totalUptime,
      averageConnectionDuration: this.connectionStats.totalConnections > 0 ? 
        totalUptime / this.connectionStats.totalConnections : 0,
      activeSessions: Array.from(this.activeConnections.keys())
    };
  }

  /**
   * Reset statistics
   */
  static resetStats(): void {
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: this.activeConnections.size,
      totalEvents: 0,
      connectionErrors: 0,
      averageLatency: 0
    };
    
    logDebug('SSE statistics reset');
  }

  // ===============================================
  // 🧪 Testing and Development
  // ===============================================

  /**
   * Test SSE connection functionality
   */
  static async testConnection(sessionId: string): Promise<{
    success: boolean;
    connectionTime: number;
    firstEventTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    let firstEventTime: number | undefined;
    
    try {
      logDebug('Testing SSE connection for session:', sessionId);
      
      const cleanup = await this.connectToDatabase(sessionId, (stage, status, message) => {
        if (!firstEventTime) {
          firstEventTime = Date.now();
        }
        logDebug('Test event received:', { stage, status, message });
      }, {
        timeoutMs: 10000, // 10 second timeout for test
        enableRetry: false
      });
      
      // Wait a bit for events
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      cleanup();
      
      const connectionTime = Date.now() - startTime;
      
      return {
        success: true,
        connectionTime,
        firstEventTime: firstEventTime ? firstEventTime - startTime : undefined
      };
    } catch (error) {
      return {
        success: false,
        connectionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Simulate database events for testing
   */
  static simulateEvents(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ): () => void {
    logDebug('Simulating database events for session:', sessionId);
    
    const events: DBProgressEvent[] = [
      {
        type: 'progress_update',
        session_id: sessionId,
        status: 'active',
        message: 'Starting OCR processing',
        timestamp: new Date().toISOString(),
        progress: {
          session_id: sessionId,
          total_items: 10,
          translation_completed: 0,
          description_completed: 0,
          image_completed: 0,
          fully_completed: 0,
          progress_percentage: 0,
          last_updated: new Date().toISOString()
        }
      },
      {
        type: 'progress_update',
        session_id: sessionId,
        status: 'active',
        message: 'Translation in progress',
        timestamp: new Date().toISOString(),
        progress: {
          session_id: sessionId,
          total_items: 10,
          translation_completed: 5,
          description_completed: 0,
          image_completed: 0,
          fully_completed: 0,
          progress_percentage: 50,
          last_updated: new Date().toISOString()
        }
      },
      {
        type: 'session_completed',
        session_id: sessionId,
        status: 'completed',
        message: 'All items processed successfully',
        timestamp: new Date().toISOString(),
        progress: {
          session_id: sessionId,
          total_items: 10,
          translation_completed: 10,
          description_completed: 10,
          image_completed: 10,
          fully_completed: 10,
          progress_percentage: 100,
          last_updated: new Date().toISOString()
        }
      }
    ];

    let eventIndex = 0;
    const interval = setInterval(() => {
      if (eventIndex < events.length) {
        this.handleDatabaseEvent(events[eventIndex], onProgress, sessionId);
        eventIndex++;
      } else {
        clearInterval(interval);
      }
    }, 2000); // Event every 2 seconds

    return () => {
      clearInterval(interval);
      logDebug('Stopped simulating events');
    };
  }
}

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).__databaseSSE = DatabaseSSEManager;
}

export default DatabaseSSEManager;