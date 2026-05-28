import { describe, it, expect } from 'vitest';

// Mock environment that matches what wrangler.toml + secrets provide
function makeEnv(overrides = {}) {
  return {
    PROVIDER: 'siliconflow',
    SILICONFLOW_API_KEY: 'sk-azemqaidnwggalhqwfdnkgygqxpgahpnmvzrzvhllnjfclin',
    SILICONFLOW_BASE: 'https://api.siliconflow.cn/v1',
    LLM_MODEL: 'deepseek-ai/DeepSeek-V4-Flash',
    SILICONFLOW_EMBED_MODEL: 'Qwen/Qwen3-VL-Embedding-8B',
    EMBED_DIM: '1024',
    ADMIN_TOKEN: 'test-admin-123',
    VECTORIZE: null as any,
    ...overrides,
  };
}

describe('SiliconFlow LLM Provider', () => {
  it('should generate a response via DeepSeek-V4-Flash', async () => {
    const env = makeEnv();
    const { llmGenerate } = await import('../../src/providers/llm');

    const answer = await llmGenerate(env, '用一句话介绍什么是 RAG。');
    console.log('LLM response:', answer);

    expect(answer).toBeTruthy();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);
  }, 60000); // 60s timeout for API call
});

describe('SiliconFlow Embedding Provider', () => {
  it('should generate 1024-dim embeddings via Qwen/Qwen3-VL-Embedding-8B', async () => {
    const env = makeEnv();
    const { createEmbedder } = await import('../../src/providers/embeddings');

    const embedder = createEmbedder(env);
    const vectors = await embedder.embed(['RAG 是一种结合检索和生成的技术。'], 1024);

    console.log('Embedding vector length:', vectors[0].length);

    expect(vectors).toHaveLength(1);
    expect(vectors[0]).toHaveLength(1024);
    expect(vectors[0].every(v => typeof v === 'number')).toBe(true);
  }, 60000);

  it('should handle batch embedding', async () => {
    const env = makeEnv();
    const { createEmbedder } = await import('../../src/providers/embeddings');

    const embedder = createEmbedder(env);
    const texts = [
      'RAG 是一种结合检索和生成的技术。',
      '向量数据库用于存储和搜索嵌入向量。',
      '大语言模型可以理解和生成自然语言。',
    ];
    const vectors = await embedder.embed(texts, 1024);

    expect(vectors).toHaveLength(3);
    vectors.forEach((v, i) => {
      expect(v).toHaveLength(1024);
      console.log(`Vector ${i} length:`, v.length);
    });
  }, 60000);
});
