import type { Env } from '../utils/schema';

export async function llmGenerate(env: Env, prompt: string): Promise<string> {
  if (env.PROVIDER === 'gemini') {
    if (!env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is required when using Gemini provider');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL || 'gemini-2.5-flash'}:generateContent?key=${env.GOOGLE_API_KEY}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    
    console.log('Calling Gemini API with model:', env.LLM_MODEL || 'gemini-2.5-flash-lite');
    
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!r.ok) {
      const errorText = await r.text();
      console.error('Gemini API error:', r.status, errorText);
      throw new Error(`Gemini generate error: ${r.status} - ${errorText}`);
    }
    
    const j = await r.json();
    console.log('Gemini response:', JSON.stringify(j, null, 2));
    
    const parts = (j as any).candidates?.[0]?.content?.parts || [];
    const result = parts.map((p: any) => p.text || '').join('');
    
    console.log('Generated answer:', result);
    return result;
  }
  if (env.PROVIDER === 'qwen') {
    const url = env.QWEN_CHAT_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const body = {
      model: env.LLM_MODEL || 'qwen-plus',
      messages: [
        { role: 'system', content: '请用中文回答，并在末尾列出来源路径。' },
        { role: 'user', content: prompt }
      ]
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Qwen generate error: ${r.status}`);
    const j = await r.json();
    return (j as any).choices?.[0]?.message?.content || '';
  }
  if (env.PROVIDER === 'siliconflow') {
    const url = (env.SILICONFLOW_BASE || 'https://api.siliconflow.cn/v1').replace(/\/+$/, '') + '/chat/completions';
    const body = {
      model: env.LLM_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        { role: 'system', content: '请用中文回答，并在末尾列出来源路径。' },
        { role: 'user', content: prompt }
      ]
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`SiliconFlow generate error: ${r.status}`);
    const j = await r.json();
    return (j as any).choices?.[0]?.message?.content || '';
  }
  throw new Error('Unknown PROVIDER');
}

// --- Streaming support ---

function parseSSEStream(response: Response): ReadableStream<Uint8Array> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    }
  });
}

export async function llmGenerateStream(env: Env, prompt: string): Promise<ReadableStream<Uint8Array>> {
  if (env.PROVIDER === 'siliconflow') {
    const url = (env.SILICONFLOW_BASE || 'https://api.siliconflow.cn/v1').replace(/\/+$/, '') + '/chat/completions';
    const body = {
      model: env.LLM_MODEL || 'deepseek-ai/DeepSeek-V4-Flash',
      messages: [
        { role: 'system', content: '请用中文回答，并在末尾列出来源路径。' },
        { role: 'user', content: prompt }
      ],
      stream: true
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`SiliconFlow stream error: ${r.status}`);
    return parseSSEStream(r);
  }
  throw new Error('Streaming not supported for this provider');
}
