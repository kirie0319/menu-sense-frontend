export interface MenuItem {
  japanese_name?: string;
  english_name?: string;
  description?: string;
  price?: string;
}

export interface TranslationResponse {
  extracted_text: string;
  menu_items: MenuItem[];
  message?: string;
}

export interface TranslationState {
  isLoading: boolean;
  result: TranslationResponse | null;
  error: string | null;
  selectedFile: File | null;
}

export interface ApiError {
  detail: string;
} 