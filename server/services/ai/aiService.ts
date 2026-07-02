import OpenAI from 'openai';
import { Response } from 'express';

let aiClient: OpenAI | null = null;

function getAIClient(): OpenAI {
  if (!aiClient) {
    const provider = (process.env.AI_PROVIDER || 'sambanova').toLowerCase();
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
  const provider = (process.env.AI_PROVIDER || 'sambanova').toLowerCase();
  if (provider === 'sambanova') {
    return process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.3-70B-Instruct';
  }
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

export async function streamChatResponse(
  prompt: string,
  context: AIContext,
  res: Response
): Promise<void> {
  const systemPrompt = buildSystemPrompt(context);
  const model = getAIModel();

  // Set SSE headers
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

export async function getChatCompletion(
  prompt: string,
  context: AIContext,
  maxTokens = 2000
): Promise<string> {
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
