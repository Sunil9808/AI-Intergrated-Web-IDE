import { Router, Request, Response } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

// Test AI connectivity
router.get('/test', async (_req: Request, res: Response) => {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const key = process.env.GEMINI_API_KEY || '';
  res.json({
    provider,
    keySet: key.length > 10,
    keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : 'NOT SET',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });
});

// All AI routes
router.post('/chat', aiController.chat);
router.post('/complete', aiController.complete);
router.post('/agent', aiController.agent);
router.post('/explain', aiController.explain);
router.post('/generate', aiController.generate);
router.post('/debug', aiController.debug);
router.post('/refactor', aiController.refactor);
router.post('/review', aiController.review);
router.post('/test', aiController.generateTests);
router.post('/document', aiController.generateDocs);
router.post('/convert', aiController.convert);
// Auto-detect workspace languages and return extension recommendations
router.post('/auto-extensions', aiController.autoExtensions);

export default router;

