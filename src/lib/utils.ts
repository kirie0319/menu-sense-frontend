import { clsx, type ClassValue } from 'clsx';

/**
 * クラス名をマージするユーティリティ関数
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * ユニークなセッションIDを生成
 */
export function generateSessionId(): string {
  // crypto.randomUUID()が利用可能な場合は使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // フォールバック: タイムスタンプ + ランダム文字列
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  return `session-${timestamp}-${random}`;
}

/**
 * localStorageからファイルデータを取得してFileオブジェクトに復元
 */
export async function restoreFileFromStorage(storageKey: string = 'uploadedFile'): Promise<File | null> {
  try {
    const savedFileData = localStorage.getItem(storageKey);
    if (!savedFileData) {
      console.warn('[Utils] No file data found in localStorage');
      return null;
    }

    const fileData = JSON.parse(savedFileData);
    
    // Base64データをBlobに変換
    const response = await fetch(fileData.data);
    const blob = await response.blob();
    
    // Fileオブジェクトとして復元
    const file = new File([blob], fileData.name, { 
      type: fileData.type,
      lastModified: Date.now()
    });
    
    console.log('[Utils] ✅ File restored from localStorage:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    return file;
    
  } catch (error) {
    console.error('[Utils] ❌ Failed to restore file from localStorage:', error);
    return null;
  }
}

/**
 * localStorageからファイルデータを削除
 */
export function clearStoredFile(storageKey: string = 'uploadedFile'): void {
  try {
    localStorage.removeItem(storageKey);
    console.log('[Utils] 🧹 Stored file data cleared');
  } catch (error) {
    console.error('[Utils] ❌ Failed to clear stored file:', error);
  }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ファイル形式を検証
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  return validTypes.includes(file.type);
}

/**
 * ファイルサイズを検証（最大10MB）
 */
export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * ファイルを検証（形式とサイズ）
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!isValidImageFile(file)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPG, PNG, GIF)'
    };
  }
  
  if (!isValidFileSize(file)) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }
  
  return { valid: true };
}

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 遅延実行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 