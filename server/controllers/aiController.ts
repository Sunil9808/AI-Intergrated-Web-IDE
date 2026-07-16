import { Request, Response, NextFunction } from 'express';
import { streamChatResponse, getChatCompletion, getInlineCompletion, AIContext } from '../services/ai/aiService';
import { runPairProgrammerAgent, autoDetectAndRecommendExtensions } from '../services/ai/agentService';

export const aiController = {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, context = {} } = req.body as { prompt: string; context: AIContext };

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt is required and must be a string' });
        return;
      }

      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async agent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { task, context = {} } = req.body as { task: string; context: AIContext };

      if (!task || typeof task !== 'string') {
        res.status(400).json({ error: 'task is required and must be a string' });
        return;
      }

      const result = await runPairProgrammerAgent(task, context);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async explain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language = 'code', context = {} } = req.body as {
        code: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Explain this ${language} code in detail:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { description, language = 'typescript', context = {} } = req.body as {
        description: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Generate production-ready ${language} code for:\n\n${description}\n\nProvide clean, well-commented code with explanations.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async debug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, error: errorMsg, language = 'code', context = {} } = req.body as {
        code: string;
        error: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Debug this ${language} code:\n\nError: ${errorMsg}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nFind the root cause and provide a fix with explanation.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async refactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, instruction, language = 'code', context = {} } = req.body as {
        code: string;
        instruction: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Refactor this ${language} code: ${instruction}\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide refactored code with explanations of all changes.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async review(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language = 'code', context = {} } = req.body as {
        code: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Review this ${language} code for quality, performance, security, and best practices:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide specific, actionable feedback.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async generateTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language = 'code', framework = 'jest', context = {} } = req.body as {
        code: string;
        language: string;
        framework: string;
        context: AIContext;
      };

      const prompt = `Write comprehensive ${framework} unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude: happy path, edge cases, error scenarios, and mock usage.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async generateDocs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language = 'code', context = {} } = req.body as {
        code: string;
        language: string;
        context: AIContext;
      };

      const prompt = `Generate comprehensive documentation for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude JSDoc/docstrings, parameter types, return values, examples.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prefix = '', suffix = '', language = 'plaintext', context = {} } = req.body as {
        prefix: string;
        suffix: string;
        language: string;
        context: AIContext;
      };

      const completion = await getInlineCompletion(prefix, suffix, language, context);
      res.json({ completion });
    } catch (error) {
      next(error);
    }
  },

  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, fromLang, toLang, context = {} } = req.body as {
        code: string;
        fromLang: string;
        toLang: string;
        context: AIContext;
      };

      const prompt = `Convert this ${fromLang} code to ${toLang}:\n\n\`\`\`${fromLang}\n${code}\n\`\`\`\n\nProvide idiomatic ${toLang} code with explanations.`;
      await streamChatResponse(prompt, context, res);
    } catch (error) {
      next(error);
    }
  },

  async autoExtensions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language } = req.body as { language?: string };
      const recommendations = await autoDetectAndRecommendExtensions(language);
      res.json({ recommendations: recommendations || [] });
    } catch (error) {
      next(error);
    }
  },
};

