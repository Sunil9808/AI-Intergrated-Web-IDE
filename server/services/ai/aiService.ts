import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Response } from 'express';

let aiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;

export function getAIProvider(): string {
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase();
}

function getGeminiClient(): GenerativeModel {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  if (!geminiModel) {
    // Use gemini-2.0-flash-lite for higher free-tier quota, fallback to gemini-1.5-flash
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    geminiModel = geminiClient.getGenerativeModel({
      model: modelName,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });
  }
  return geminiModel;
}


function getAIClient(): OpenAI {
  if (!aiClient) {
    const provider = getAIProvider();
    const isSambaNova = provider === 'sambanova';
    const apiKey = isSambaNova ? process.env.SAMBANOVA_API_KEY : process.env.OPENAI_API_KEY;
    const placeholder = isSambaNova ? 'your_sambanova_api_key_here' : 'your_openai_api_key_here';

    if (!apiKey || apiKey === placeholder) {
      throw new Error(`${isSambaNova ? 'SAMBANOVA_API_KEY' : 'OPENAI_API_KEY'} is not configured. Add it to your .env file.`);
    }

    aiClient = new OpenAI({
      apiKey,
      baseURL: isSambaNova
        ? process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1'
        : process.env.OPENAI_BASE_URL,
    });
  }
  return aiClient;
}

export function getAIModel(): string {
  const provider = getAIProvider();
  if (provider === 'gemini') return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  if (provider === 'sambanova') return process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.3-70B-Instruct';
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

export interface AIContext {
  currentFile?: {
    path: string;
    content: string;
    language: string;
    name: string;
  };
  selectedCode?: {
    text: string;
    startLine: number;
    endLine: number;
    language: string;
  };
  openFiles?: Array<{ path: string; name: string; language: string }>;
  workspaceName?: string;
  recentErrors?: string[];
  terminalOutput?: string;
}

function buildSystemPrompt(context: AIContext): string {
  let systemPrompt = `You are an expert AI programming assistant integrated into AI Web IDE, a VS Code-style web IDE.

Your capabilities:
- Explain code clearly and thoroughly
- Generate clean, production-ready code
- Debug errors with precise diagnosis
- Refactor code for better quality
- Write comprehensive tests
- Create detailed documentation
- Convert code between languages
- Review code for quality, security, and performance
- When running in pair-programmer mode, produce concrete workspace changes through the available tools instead of only giving advice

Always respond with:
- Clear explanations
- Well-formatted code blocks using \`\`\`language syntax
- Actionable suggestions
- Best practices

Current workspace context:`;

  if (context.workspaceName) {
    systemPrompt += `\n- Workspace: ${context.workspaceName}`;
  }

  if (context.currentFile) {
    systemPrompt += `\n- Active file: ${context.currentFile.path} (${context.currentFile.language})`;
    if (context.currentFile.content && context.currentFile.content.length < 8000) {
      systemPrompt += `\n\nCurrent file content:\n\`\`\`${context.currentFile.language}\n${context.currentFile.content}\n\`\`\``;
    }
  }

  if (context.openFiles && context.openFiles.length > 0) {
    systemPrompt += `\n- Open files: ${context.openFiles.map(f => f.path).join(', ')}`;
  }

  if (context.recentErrors && context.recentErrors.length > 0) {
    systemPrompt += `\n\nRecent errors:\n${context.recentErrors.join('\n')}`;
  }

  if (context.terminalOutput) {
    systemPrompt += `\n\nRecent terminal output:\n${context.terminalOutput}`;
  }

  return systemPrompt;
}

// ── Gemini streaming ──────────────────────────────────────────────────────────

async function streamGeminiResponse(prompt: string, context: AIContext, res: Response): Promise<void> {
  const systemPrompt = buildSystemPrompt(context);
  const model = getGeminiClient();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const fullPrompt = `${systemPrompt}\n\n---\n\nUser: ${prompt}\n\nAssistant:`;
    const result = await model.generateContentStream(fullPrompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string; statusText?: string; errorDetails?: unknown };
    console.error('[Gemini] Full error:', JSON.stringify({ message: err.message, status: err.status, code: err.code, errorDetails: err.errorDetails }));

    let errorMessage = 'Gemini AI request failed';
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      errorMessage = 'Invalid Gemini API key. Please check your .env file and restart the server.';
    } else if (err.message?.includes('API key') || err.message?.includes('API_KEY')) {
      errorMessage = 'Gemini API key error: ' + err.message;
    } else if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('rate') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = '⚠️ Gemini rate limit hit. Your API key has exhausted the free quota. Get a new key from https://aistudio.google.com/app/apikey';
    } else if (err.status === 403) {
      errorMessage = 'Gemini API access denied. Check your API key permissions.';
    } else if (err.message) {
      errorMessage = err.message;
    }

    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}


async function getGeminiCompletion(prompt: string, context: AIContext, maxTokens = 2000): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
  const model = getGeminiClient();

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  });

  return result.response.text();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function streamChatResponse(prompt: string, context: AIContext, res: Response): Promise<void> {
  const provider = getAIProvider();

  if (provider === 'gemini') {
    return streamGeminiResponse(prompt, context, res);
  }

  // OpenAI / SambaNova path
  const systemPrompt = buildSystemPrompt(context);
  const model = getAIModel();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const client = getAIClient();

    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }
      if (chunk.choices[0]?.finish_reason === 'stop') {
        break;
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string };
    console.error('AI streaming error:', err.message);

    let errorMessage = 'AI request failed';
    if (err.message?.includes('API key')) {
      errorMessage = 'Invalid or missing AI API key. Check your .env file.';
    } else if (err.status === 429) {
      errorMessage = 'AI provider rate limit exceeded. Please wait and try again.';
    } else if (err.status === 401) {
      errorMessage = 'Invalid AI API key. Please check your .env configuration.';
    } else if (err.message) {
      errorMessage = err.message;
    }

    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

export async function getInlineCompletion(
  prefix: string,
  suffix: string,
  language: string,
  context: AIContext
): Promise<string> {
  const prompt = `You are an inline code completion engine like Cursor Tab / GitHub Copilot.
Complete the code at the cursor position. Return ONLY the text to insert at the cursor — no markdown fences, no explanation, no quotes.

Language: ${language}

Code BEFORE cursor:
${prefix.slice(-3000)}

Code AFTER cursor:
${suffix.slice(0, 1000)}

Rules:
- Return only the completion text (what comes next as the developer types)
- Match existing indentation and style
- Prefer short, focused completions (1-5 lines max)
- If no meaningful completion exists, return an empty response`;

  const result = await getChatCompletion(prompt, context, 256);
  return cleanInlineCompletion(result);
}

function cleanInlineCompletion(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.replace(/^\n+/, '');
}

export async function getChatCompletion(prompt: string, context: AIContext, maxTokens = 2000): Promise<string> {
  const provider = getAIProvider();

  if (provider === 'gemini') {
    return getGeminiCompletion(prompt, context, maxTokens);
  }

  const systemPrompt = buildSystemPrompt(context);
  const model = getAIModel();

  const client = getAIClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}
