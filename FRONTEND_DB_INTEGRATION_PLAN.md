# フロントエンドデータベース統合計画

## 📋 概要

このドキュメントは、メニュー翻訳システムのフロントエンドをデータベース（PostgreSQL）と統合し、Redis依存から移行する計画をまとめたものです。デザインは現状を維持しながら、データソースをDBに切り替えます。

## 🎯 目標

1. **デザイン維持**: 現在のUIデザインを一切変更しない
2. **DB統合**: PostgreSQLからデータを取得できるようにする
3. **リアルタイム性維持**: SSEによるリアルタイム更新を継続
4. **後方互換性**: 既存のRedis基盤の処理も動作可能にする

## 🏗️ アーキテクチャ変更

### 現在の構成
```
Frontend → Backend API → Redis (一時データ)
                      → Celery (非同期処理)
```

### 新しい構成
```
Frontend → Backend API → PostgreSQL (永続データ)
                      → Redis (キャッシュ/後方互換)
                      → Celery (非同期処理)
```

## 📊 実装フェーズ

### Phase 1: API統合層の追加
- **目的**: DB APIエンドポイントとの通信層を追加
- **変更箇所**:
  - `src/lib/api.ts`: 新しいDB APIクライアントメソッド追加
  - `src/types/index.ts`: DB APIレスポンス用の型定義追加

### Phase 2: データストアの拡張
- **目的**: DBデータとRedisデータの両方を扱えるようにする
- **変更箇所**:
  - `src/lib/stores/dataStore.ts`: DBデータ取得メソッド追加
  - データソース切り替えロジック実装

### Phase 3: リアルタイム進捗の統合
- **目的**: DB基盤のSSEストリーミングに対応
- **変更箇所**:
  - `src/lib/stores/progressStore.ts`: DB進捗エンドポイント対応
  - SSEイベントハンドラーの拡張

### Phase 4: UIコンポーネントの調整
- **目的**: DBデータ構造に対応（デザインは変更なし）
- **変更箇所**:
  - データマッピングロジックの調整
  - 既存のUIコンポーネントは変更なし

## 🔄 データフロー

### 1. セッション作成フロー
```typescript
// 新規セッション作成
POST /api/v1/menu-translation/sessions
{
  session_id: "unique_id",
  menu_items: ["寿司", "ラーメン", ...],
  metadata: { source: "web_app" }
}

// レスポンス
{
  success: true,
  session_id: "unique_id",
  database_id: "uuid",
  total_items: 10
}
```

### 2. リアルタイム進捗フロー
```typescript
// SSE接続
GET /api/v1/menu-translation/sessions/{session_id}/stream

// イベント受信
data: {
  "type": "progress_update",
  "session_id": "xxx",
  "progress": {
    "translation_completed": 5,
    "description_completed": 3,
    "image_completed": 2,
    "total_items": 10
  }
}
```

### 3. データ取得フロー
```typescript
// セッション全体取得
GET /api/v1/menu-translation/sessions/{session_id}

// レスポンス
{
  session_id: "xxx",
  status: "processing",
  menu_items: [
    {
      item_id: 0,
      japanese_text: "寿司",
      english_text: "Sushi",
      category: "Main Dishes",
      description: "...",
      image_url: "https://...",
      translation_status: "completed",
      description_status: "completed",
      image_status: "processing"
    }
  ]
}
```

## 🛠️ 実装詳細

### 1. API クライアントの拡張

```typescript
// src/lib/api.ts に追加
export class MenuTranslationDBApi {
  // セッション作成
  static async createSession(menuItems: string[]): Promise<DBSessionResponse>
  
  // セッション取得
  static async getSession(sessionId: string): Promise<DBSessionDetail>
  
  // 進捗取得
  static async getProgress(sessionId: string): Promise<DBProgressResponse>
  
  // SSEストリーム接続
  static async streamProgress(sessionId: string, onEvent: (event: DBProgressEvent) => void): Promise<() => void>
  
  // 検索
  static async searchMenuItems(query: string, options?: SearchOptions): Promise<DBSearchResponse>
}
```

### 2. 型定義の追加

```typescript
// src/types/index.ts に追加
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
```

### 3. データストアの統合

```typescript
// src/lib/stores/dataStore.ts に追加
interface DataStore {
  // 既存のメソッド...
  
  // DB統合メソッド
  useDatabase: boolean;
  setDataSource: (useDB: boolean) => void;
  fetchDBSession: (sessionId: string) => Promise<void>;
  syncWithDatabase: () => Promise<void>;
  
  // 統合データ取得
  getUnifiedMenuData: () => MenuData | null;
}
```

### 4. 進捗ストアの拡張

```typescript
// src/lib/stores/progressStore.ts に追加
interface ProgressStore {
  // 既存のメソッド...
  
  // DB進捗追跡
  dbSessionId?: string;
  dbProgress?: DBProgressResponse;
  connectDBStream: (sessionId: string) => Promise<void>;
  disconnectDBStream: () => void;
}
```

## 🔧 設定とフラグ

### 環境変数
```bash
# .env.local
NEXT_PUBLIC_USE_DATABASE=true
NEXT_PUBLIC_DB_API_ENABLED=true
NEXT_PUBLIC_ENABLE_DB_FALLBACK=true
```

### フィーチャーフラグ
```typescript
// src/lib/config.ts
export const config = {
  features: {
    useDatabase: process.env.NEXT_PUBLIC_USE_DATABASE === 'true',
    enableDBFallback: process.env.NEXT_PUBLIC_ENABLE_DB_FALLBACK === 'true',
    preferDatabase: true, // DBを優先的に使用
  }
};
```

## 📈 移行戦略

### 段階的移行
1. **Stage 1**: DB APIクライアントを追加（既存機能に影響なし）
2. **Stage 2**: フィーチャーフラグで切り替え可能にする
3. **Stage 3**: 新規ユーザーはDB使用、既存ユーザーはRedis継続
4. **Stage 4**: 全ユーザーをDBに移行

### データ移行
- 既存のRedisセッションは`/api/v1/menu-translation/migrate/{session_id}`で移行
- 自動移行バッチ処理も検討

## 🧪 テスト計画

### 単体テスト
- DB APIクライアントのテスト
- データストア統合ロジックのテスト
- 型変換ロジックのテスト

### 統合テスト
- Redis→DB切り替えテスト
- SSEストリーミングテスト
- エラーハンドリングテスト

### E2Eテスト
- 完全なユーザーフローテスト
- パフォーマンステスト
- 同時接続テスト

## 🚀 デプロイ計画

### 前提条件
- バックエンドのDB APIが稼働している
- PostgreSQLが適切に設定されている
- 環境変数が設定されている

### デプロイ手順
1. フィーチャーフラグをOFFで本番デプロイ
2. 一部ユーザーでA/Bテスト実施
3. 問題がなければ段階的にロールアウト
4. 全ユーザーに展開

## 📝 注意事項

### パフォーマンス
- DB APIはRedisより遅い可能性があるため、適切なローディング表示が必要
- キャッシュ戦略の検討が必要

### エラーハンドリング
- DB接続エラー時はRedisにフォールバック
- ユーザーへの適切なエラーメッセージ表示

### 後方互換性
- 既存のRedisベースのセッションは引き続き動作
- 移行は段階的に実施

## 🎯 成功指標

1. **機能維持**: 既存の全機能が正常動作
2. **パフォーマンス**: レスポンスタイム3秒以内
3. **信頼性**: 99.9%のアップタイム
4. **ユーザー体験**: UIの変更なし、スムーズな動作

## 📅 タイムライン

- **Week 1-2**: API統合層の実装
- **Week 3-4**: データストア統合とテスト
- **Week 5-6**: 本番環境でのA/Bテスト
- **Week 7-8**: 全ユーザーへの展開

この計画に従って実装を進めることで、デザインを維持しながらスムーズにデータベース統合を実現できます。 