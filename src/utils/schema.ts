export type MatchMeta = {
  text?: string;
  source?: string;
  title?: string;
  url?: string;
  language?: string;
};

export interface VectorizeIndex {
  upsert(items: { id: string; values: number[]; metadata?: Record<string, any> }[]): Promise<void>;
  query(vector: number[], opts: { 
    topK: number; 
    returnValues?: boolean; 
    includeMetadata?: boolean;
    returnMetadata?: string;
    filter?: { metadata: Record<string, any> };
  }): Promise<{
    matches: { id: string; score: number; metadata?: MatchMeta }[];
  }>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(col?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T[]>>;
  raw(): Promise<any[][]>;
}

export interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: any;
}

export interface Env {
  VECTORIZE: VectorizeIndex;
  DB: D1Database;

  PROVIDER: 'gemini' | 'qwen' | 'siliconflow';
  GOOGLE_API_KEY?: string;
  QWEN_API_KEY?: string;
  QWEN_BASE?: string;
  QWEN_EMBED_MODEL?: string;
  QWEN_CHAT_BASE?: string;
  SILICONFLOW_API_KEY?: string;
  SILICONFLOW_BASE?: string;
  SILICONFLOW_EMBED_MODEL?: string;

  LLM_MODEL?: string;
  ADMIN_TOKEN: string;
  EMBED_DIM: string;
}
