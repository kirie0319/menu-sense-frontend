import { api } from './config';
import { 
  PipelineHealthResponse, 
  SSEHealthResponse, 
  ApiError 
} from '@/types';
import axios from 'axios';

// ===============================================
// 🏥 Health Check Functions
// ===============================================

/**
 * パイプラインのヘルスチェック
 */
export async function checkPipelineHealth(): Promise<PipelineHealthResponse> {
  console.log('[Health] 🏥 Checking pipeline health...');
  
  try {
    const response = await api.get<PipelineHealthResponse>('/pipeline/health');
    
    console.log('[Health] ✅ Pipeline health check successful:', {
      status: response.data.status,
      service: response.data.service,
      version: response.data.version
    });
    
    return response.data;
  } catch (error) {
    console.error('[Health] ❌ Pipeline health check failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running. Please start the backend server.');
      } else if (error.response?.data) {
        const apiError = error.response.data as ApiError;
        throw new Error(apiError.detail || 'Pipeline health check failed');
      }
    }
    
    throw new Error('Pipeline health check failed');
  }
}

/**
 * SSEのヘルスチェック
 */
export async function checkSSEHealth(): Promise<SSEHealthResponse> {
  console.log('[Health] 🏥 Checking SSE health...');
  
  try {
    const response = await api.get<SSEHealthResponse>('/sse/health');
    
    console.log('[Health] ✅ SSE health check successful:', {
      status: response.data.status,
      redis_available: response.data.redis_available,
      active_sessions: response.data.active_sessions
    });
    
    return response.data;
  } catch (error) {
    console.error('[Health] ❌ SSE health check failed:', error);
    throw new Error('SSE health check failed');
  }
}