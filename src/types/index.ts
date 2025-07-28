export * from '@/features/menu/types';
export * from './ui';
export * from './components';

import type { TranslationResponse } from '@/features/menu/types';
export interface TranslationState {
  isLoading: boolean;
  result: TranslationResponse | null;
  error: string | null;
  selectedFile: File | null;
}

export interface ApiError {
  detail: string;
}

export interface DBMenuItem {
  id: string;
  session_id: string;
  item_id: number;
  japanese_text: string;
  english_text?: string;
  category?: string;
  description?: string;
  image_url?: string;
  translation_status: 'pending' | 'completed' | 'failed';
  description_status: 'pending' | 'completed' | 'failed';
  image_status: 'pending' | 'completed' | 'failed';
  providers: ProcessingProvider[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingProvider {
  stage: 'translation' | 'description' | 'image';
  provider: string;
  processing_time_ms?: number;
  fallback_used: boolean;
  processed_at: string;
}

export interface DBSessionResponse {
  success: boolean;
  session_id: string;
  database_id: string;
  total_items: number;
  status: string;
  created_at: string;
  message: string;
}

export interface DBSessionDetail {
  session_id: string;
  total_items: number;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
  menu_items: DBMenuItem[];
  progress: DBProgressInfo;
}

export interface DBProgressInfo {
  session_id: string;
  total_items: number;
  translation_completed: number;
  description_completed: number;
  image_completed: number;
  fully_completed: number;
  progress_percentage: number;
  last_updated: string;
}

export interface DBProgressResponse {
  session_id: string;
  progress: DBProgressInfo;
  last_updated: string;
}

export interface DBSearchOptions {
  category?: string;
  limit?: number;
  page?: number;
}

export interface DBSearchResponse {
  query: string;
  total_results: number;
  results: DBMenuItem[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface DBProgressEvent {
  type: 'progress_update' | 'item_completed' | 'session_completed' | 'error' | 'heartbeat';
  session_id: string;
  timestamp: string;
  status?: string;
  message?: string;
  data?: any;
  progress?: DBProgressInfo;
  item?: DBMenuItem;
}

export interface DataSourceConfig {
  source: 'redis' | 'database' | 'hybrid';
  fallbackEnabled: boolean;
  healthCheckInterval: number;
  maxLatency: number;
}

// ===============================================
// 🚀 Backend API Types (New)
// ===============================================

// Pipeline API Types
export interface PipelineHealthResponse {
  status: string;
  service: string;
  version: string;
  architecture: string;
  processing_stages: string[];
  features: string[];
  sse_channels: string;
  message: string;
}

export interface PipelineProcessResponse {
  session_id: string;
  status: string;
  processing_steps: {
    step1_ocr?: ProcessingStep;
    step2_mapping?: ProcessingStep;
    step3_categorize?: ProcessingStep;
    step4_parallel_tasks?: ProcessingStep;
  };
  final_results?: any;
  saved_menu_items?: any[];
  processing_time?: number;
  message: string;
  sse_info: {
    channel: string;
    message_types: string[];
    realtime_updates: string;
  };
}

export interface ProcessingStep {
  db_updated: boolean;
  sse_broadcasted: boolean;
  [key: string]: any;
}

export interface SessionStatusResponse {
  session_id: string;
  status: string;
  current_stage: number;
  stages_completed: string[];
  stages_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  menu_ids: string[];
}

// SSE API Types
export interface SSEHealthResponse {
  status: string;
  service: string;
  version: string;
  redis_available: boolean;
  active_sessions: number;
  active_connections: number;
  connection_details: Record<string, number>;
  features: string[];
  message: string;
}

export interface SSEEventType {
  type: 'stage_completed' | 'progress_update' | 'menu_update' | 'batch_completed' | 'error' | 'connection_established' |
        'translation_batch_completed' | 'description_batch_completed' | 'allergen_batch_completed' | 
        'ingredient_batch_completed' | 'search_image_batch_completed' | 'parallel_tasks_started';
  session_id: string;
  timestamp: string;
  data?: any;
  message?: string;
}

export interface SSEError {
  type: 'connection_error' | 'parse_error' | 'timeout';
  message: string;
  session_id: string;
}

// API Configuration Types
export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SSEConfig {
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  timeout: number;
} 